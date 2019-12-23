var mongoose = require('mongoose');
var passportLocalMongoose = require('passport-local-mongoose');

var groupSchema = new mongoose.Schema({
    gname: String,
    members: [{
        type: String
    }]
});
groupSchema.plugin(passportLocalMongoose);
var Group = mongoose.model('Group', groupSchema);

module.exports = Group;