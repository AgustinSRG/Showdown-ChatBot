/**
 * Room autojoin manager
 */

'use strict';

const Path = require('path');
const FileSystem = require('fs');

const checkDir = Tools('checkdir');

class RoomManager {
	constructor(path) {
		checkDir(path);
		this.path = path;
	}

	getRooms() {
		let files = FileSystem.readdirSync(this.path);
		let rooms = [];
		for (let i = 0; i < files.length; i++) {
			if (files.indexOf('.') < 0) {
				rooms.push(files[i]);
			}
		}
		return rooms;
	}

	joinRoom(roomid) {
		if (!FileSystem.existsSync(Path.resolve(this.path, roomid))) {
			FileSystem.writeFile(Path.resolve(this.path, roomid), ".");
		}
	}

	leaveRoom(roomid) {
		if (FileSystem.existsSync(Path.resolve(this.path, roomid))) {
			FileSystem.unlink(Path.resolve(this.path, roomid));
		}
	}
}

module.exports = RoomManager;
