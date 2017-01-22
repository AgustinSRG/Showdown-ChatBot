/**
 * Server Handler: Users
 * Allows administrators add new users to the control panel
 * and edit their permissions
 */

'use strict';

const Path = require('path');
const Text = Tools('text');
const check = Tools('check');
const Template = Tools('html-template');

const mainTemplate = new Template(Path.resolve(__dirname, 'templates', 'users-main.html'));
const editTemplate = new Template(Path.resolve(__dirname, 'templates', 'users-edit.html'));

exports.setup = function (App) {
	/* Permissions */
	App.server.setPermission('users', 'Permission for managing the server users');

	/* Menu Options */
	App.server.setMenuOption('users', 'Users', '/users/', 'users', 2);

	/* Handlers */
	App.server.setHandler('users', (context, parts) => {
		if (!context.user || !context.user.can('users')) {
			context.endWith403();
			return;
		}

		let ok = null, error = null;
		if (context.post.adduser) {
			let userid = Text.toId(context.post.user);
			let pass = context.post.password;
			let pass2 = context.post.passwordconfirm;
			let name = context.post.username;
			let group = context.post.usergroup;
			try {
				check(userid, "You must specify an user.");
				check(!App.server.users[userid], "User <strong>" + userid + "</strong> already exists.");
				check(pass, "You must specify a password");
				check(pass === pass2, "The passwords do not match.");
			} catch (err) {
				error = err.message;
			}
			if (!error) {
				App.server.users[userid] = {
					id: userid,
					password: App.server.encryptPassword(pass),
					name: (name || userid),
					group: (group || ""),
					permissions: {chpass: true},
				};
				if (context.post.makeadmin) {
					App.server.users[userid].permissions['root'] = true;
				}
				App.server.userdb.write();
				ok = 'User <strong>' + userid + '</strong> sucessfully created.';
				App.logServerAction(context.user.id, "Create User: " + userid);
			}
		} else if (context.post.edituser) {
			let userid = Text.toId(context.post.user);
			let name = context.post.username;
			let group = context.post.usergroup;
			try {
				check(userid, "You must specify an user.");
				check(App.server.users[userid], "User <strong>" + userid + "</strong> does not exist.");
			} catch (err) {
				error = err.message;
			}
			if (!error) {
				App.server.users[userid].name = name || userid;
				App.server.users[userid].group = group || userid;
				for (let i in App.server.permissions) {
					if (context.post['perm-' + i]) {
						App.server.users[userid].permissions[i] = true;
					} else {
						delete App.server.users[userid].permissions[i];
					}
				}
				App.server.userdb.write();
				ok = 'User <strong>' + userid + '</strong> sucessfully editted.';
				App.logServerAction(context.user.id, "Edit User: " + userid);
			}
		} else if (context.post.deluser) {
			let userid = Text.toId(context.post.user);
			try {
				check(userid, "You must specify an user.");
				check(App.server.users[userid], "User <strong>" + userid + "</strong> does not exist.");
				check(userid !== context.user.id, "You cannot delete your own account.");
			} catch (err) {
				error = err.message;
			}
			if (!error) {
				delete App.server.users[userid];
				App.server.userdb.write();
				ok = 'User <strong>' + userid + '</strong> sucessfully deleted.';
				App.logServerAction(context.user.id, "Delete User: " + userid);
			}
		}

		let users = App.server.users;
		if (parts.length && parts[0]) {
			let user = Text.toId(parts[0]);
			if (users[user]) {
				let htmlVars = {};
				htmlVars.id = user;
				htmlVars.name = users[user].name;
				htmlVars.group = users[user].group;
				htmlVars.permissions = '';
				for (let i in App.server.permissions) {
					htmlVars.permissions += '<div class="user-perm-option">';
					htmlVars.permissions += '<input name="perm-' + i + '" type="checkbox" value="true"' +
					(users[user].permissions[i] ? 'checked="checked"' : '') + ' />';
					htmlVars.permissions += '&nbsp;<strong>' + i + '</strong>&nbsp;(' + App.server.permissions[i].desc + ')';
					htmlVars.permissions += '</div>';
				}
				htmlVars.request_result = (ok ? 'ok-msg' : (error ? 'error-msg' : ''));
				htmlVars.request_msg = (ok ? ok : (error || ""));

				context.endWithWebPage(editTemplate.make(htmlVars), {title: 'User ' + user + ' - Showdown ChatBot'});
			} else {
				context.endWithWebPage('<h1>User Not Found</h1><p>The user <b>' + user + '</b> was not found</p>', {title: 'User not found'});
			}
		} else {
			let htmlVars = {};
			htmlVars.id = (context.post.adduser ? context.post.user : '');
			htmlVars.name = (context.post.adduser ? context.post.username : '');
			htmlVars.group = (context.post.adduser ? context.post.usergroup : '');
			htmlVars.users_list = '';
			for (let u in users) {
				let target = users[u];
				htmlVars.users_list += '<tr>';
				htmlVars.users_list += '<td>' + target.id + '</td>';
				htmlVars.users_list += '<td>' + target.name + '</td>';
				htmlVars.users_list += '<td>' + (target.group || '-') + '</td>';
				htmlVars.users_list += '<td><a href="/users/' + u + '"><button>Edit</button></a>&nbsp;&nbsp;<button onclick="deleteUser(\'' +
				u + '\')">Delete</button>&nbsp;<span id=\'confirm-del-' + u + '\'></span></td>';
				htmlVars.users_list += '</tr>';
			}
			htmlVars.request_result = (ok ? 'ok-msg' : (error ? 'error-msg' : ''));
			htmlVars.request_msg = (ok ? ok : (error || ""));

			context.endWithWebPage(mainTemplate.make(htmlVars), {title: 'Users - Showdown ChatBot'});
		}
	});
};
