// Youtube Link Recognition feature for Showdown ChatBot
// Install as an Add-On
// ----------------------
// Make sure to change the following constants:
// - Rooms: List of rooms where to apply the feature
// - Youtube_API_Key: YouTube API key

'use strict';

const Rooms = ['youtube']; // Here the rooms where this feature is available
const Youtube_API_Key = "AIzaSyAXXYCNGtYjg4ol8UfkbgVR4laHWWoxS00"; // Use your own key

const Response_Text = "**%s**'s link: __%s__ by [[%s]]";
const Response_Text_Allow_Commands = false;

const Youtube_API_Host = "www.googleapis.com";
const Youtube_API_Path = "/youtube/v3/videos?id=%s&key=" + Youtube_API_Key + "&fields=items(snippet(channelTitle,title))&part=snippet";

const Util = require('util');
const Https = require('https');
const Text = Tools('text.js');

exports.setup = function (App) {
    return Tools('add-on').forApp(App).install({
        commandPermissions: {
            "youtube": { group: 'user' },
        },

        events: {
            "userchat": function (room, time, by, msg) {
                if (Rooms.indexOf(room) >= 0 && App.parser.can(by, 'youtube', room)) {
                    let name = Text.parseUserIdent(by).name;
                    if ((/youtube\.com/i).test(msg) || (/youtu\.be/i).test(msg)) {
                        let id = getLinkId(msg);
                        if (!id) return;
                        let options = {
                            host: Youtube_API_Host,
                            path: Util.format(Youtube_API_Path, id),
                        };
                        let request = Https.request(options, response => {
                            let str = '';
                            response.on('data', function (chunk) {
                                str += chunk;
                            });
                            response.on('end', function () {
                                let youtubeData = null;
                                try {
                                    youtubeData = JSON.parse(str);
                                } catch (e) {
                                    App.log("Youtube application failure. Received: " + str);
                                    return;
                                }
                                if (youtubeData && youtubeData.items && youtubeData.items.length && youtubeData.items[0].snippet) {
                                    if (youtubeData.items[0].snippet.title && youtubeData.items[0].snippet.channelTitle) {
                                        if (Response_Text_Allow_Commands) {
                                            App.bot.sendTo(room, Util.format(Response_Text, name,
                                                Text.trim(youtubeData.items[0].snippet.title), Text.trim(youtubeData.items[0].snippet.channelTitle)));
                                        } else {
                                            App.bot.sendTo(room, Text.stripCommands(Util.format(Response_Text, name,
                                                Text.trim(youtubeData.items[0].snippet.title), Text.trim(youtubeData.items[0].snippet.channelTitle))));
                                        }
                                    }
                                }
                            });
                            response.on('error', err => {
                                App.log("Could not connect to Youtube: " + Util.inspect(err));
                            });
                        });
                        request.on('error', err => {
                            App.log("Could not connect to Youtube: " + Util.inspect(err));
                        });
                        request.end();
                    }
                }
            },
        },
    });
};

function getLinkId(msg) {
    msg = msg.split(' ');
    for (let i = 0; i < msg.length; i++) {
        if ((/youtu\.be/i).test(msg[i])) {
            let temp = msg[i].split('/');
            return temp[temp.length - 1];
        } else if ((/youtube\.com/i).test(msg[i])) {
            return msg[i].substring(msg[i].indexOf("=") + 1).replace(".", "");
        }
    }
}