var express = require('express');
var mongoose = require('mongoose');
var bodyParser = require("body-parser");
var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var User = require('./models/user.js');
var Group = require('./models/group.js');
var passport = require('passport');
var LocalStrategy = require('passport-local');
var passportLocalMongoose = require('passport-local-mongoose');


app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));
app.use(require("express-session")({
    secret: "finish your work",
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

mongoose.connect("mongodb+srv://sohail:aeiou1999@cluster0-rib1u.mongodb.net/test?retryWrites=true", { useNewUrlParser: true });

// HOMEPAGE REDIRECT TO REGISTER
app.get('/', (_req, res) => {
    if (!_req.isAuthenticated()) {
        res.render("register.ejs");
    }
    else {
        res.redirect('/index');
    }
});

// LOGIN PAGE
app.get('/login', function (req, res) {
    if (!req.isAuthenticated()) {
        res.render("login");
    }
    else {
        res.redirect('/index');
    }
});

// CHECKING IF LOGIN IS SUCCESS OR NOT
app.post('/login', passport.authenticate("local", {
    successRedirect: "/index",
    failureRedirect: "/login"
}), function (req, res) {
    
});

app.post('/register', function (req, res) {
    User.register({ username: req.body.username }, req.body.password, function (err, user) {
        if (err) {
            console.log(err);
            res.redirect('/');
        }
        else {
            passport.authenticate("local")(req, res, function () {
                res.redirect("/index");
            })
        }
    });
})

// INDEX PAGE CONSIST OF LIST OF GROUPS
app.get('/index', (_req, res) => {
    if (_req.isAuthenticated()) {
        res.render("index", { groups: _req.user.groupList, username: _req.user.username, code: 0, message: "" });
    }
    else {
        res.redirect('/');
    }
});

// JOIN GROUP PAGE
app.get('/group/create', function (req, res) {
    if (req.isAuthenticated()) {
        res.render("create", {username: req.user.username});
    }
    else {
        res.redirect('/');
    }
})

// CREATE GROUP PAGE
app.get('/group/join', function (req, res) {
    if (req.isAuthenticated()) {
        res.render("join", { username: req.user.username });
    }
    else {
        res.redirect('/');
    }
})

// CREATING NEW GROUP
app.post('/group', function (req, res) {

    if (!req.isAuthenticated()) {
        res.redirect('/login');
        return;
    }
    
    Group.find({ gname: req.body.name }, function (err, group) {
        if (err) {
            console.log(err);
        }
        else if (group.length === 0) {
            console.log(req.user.username);
            console.log(group);

            console.log(req.body.name);
            Group.collection.dropIndex();
            Group.create({ gname: req.body.name }, function (err, grp) {
                if (err) {
                    console.log(err);
                }
                else {
                   
                            req.user.groupList.push(grp.gname);
                            req.user.save();
                            grp.members.push(req.user.username);
                            grp.save();
                            res.render('index', { groups: req.user.groupList,username: req.user.username, code: 1,message: "Created New Group Successfully!"});
                       
                }
            })

        }
        else {
            res.render('index', { groups: req.user.groupList, username: req.user.username, code: 2, message: "Group Already Exist!" });
        }
    })
    
});

// TAKING USER TO GROUP CHAT
app.get('/group/:name', function (req, res) {
    if (!req.isAuthenticated()) {
        res.redirect('/login');
        return;
    }
    if (req.user.groupList.indexOf(req.params.name) !== -1) {
        res.render("group", { username: req.user.username, room: req.params.name });
    }
    else {
        res.redirect('/index');
    }
})

app.post('/group/join', function (req, res) {
    if (!req.isAuthenticated()) {
        res.redirect('/login');
        return;
    }
    Group.find({ gname: req.body.name }, function (err, group) {
        if (err) {
            console.log(err);
        }
        else {
            console.log(group);
            if (group.length > 0) {
                if (req.user.groupList.indexOf(group) == -1) {
                    group[0].members.push(req.user.username);
                    group[0].save();
                    req.user.groupList.push(group[0].gname);
                    req.user.save();
                }
                res.render('index', { groups: req.user.groupList, username: req.user.username,code: 1,message: "Joined Successfully!" });
            }
            else {
                res.render('index', { groups: req.user.groupList, username: req.user.username, code: 2,message: "Error! Group may not exist" });
            }
        }
    })
})

var rooms = [];

io.on('connection', function (socket) {
    console.log('USER CONNECTED');
    var user = "";
    var roomList = [];
    socket.on('room', function (data) {
        if (rooms[data.room] == undefined) rooms[data.room] = [];
        user = data.username;
        roomList.push(data.room);
        rooms[data.room].push(data.username);
        console.log("JOINING ROOM");
        socket.join(data["room"]);
        io.to(data.room).emit('add user', { users: rooms[data.room] });
        console.log(rooms);
    });

    socket.on('chat message', function (data) {
        console.log(data.message + ' ' + data.room);
        io.to(data.room).emit('chat message', { username: data.username, message: data.message });
    });

    socket.on('disconnect', function () {
        // Do stuff (probably some jQuery)
        console.log('disconnected');
        console.log(roomList);
        for (var i = 0; i < roomList.length; ++i) {
            if (rooms[roomList[i]] != undefined) {
                var index = rooms[roomList[i]].indexOf(user);
                if (index > -1) {
                    rooms[roomList[i]].splice(index, 1);
                    io.to(roomList[i]).emit('add user', { users: rooms[roomList[i]] });
                }
            }
        }
    });
});

app.get('/logout', function (req, res) {
    req.logout();
    res.redirect('/');
})

http.listen(3000, function () {
    console.log('listening on : 3000');
});

app.listen(process.env.PORT, process.env.ID, () => console.log("SERVER RUNNING"));