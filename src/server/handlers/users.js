/**
 * Server Handler: Users
 */

'use strict';

const Text = Tools.get('text');
const check = Tools.get('check.js');

/* Permissions */

App.server.setPermission('users', 'Permission for managing the server users');

/* Menu Options */

App.server.setMenuOption('users', 'Users', '/users/', 'users', 2);

/* Handlers */

App.server.setHandler('users', (context, parts) => {
	/* Permission check */
	if (!context.user || !context.user.can('users')) {
		context.endWith403();
		return;
	}

	/* Actions */
	let ok = null, error = null;
	if (context.post.adduser) {
		/* Add user */
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
				password: pass,
				name: (name || userid),
				group: (group || ""),
				permissions: {chpass: true},
			};
			App.server.userdb.write();
			ok = 'User <strong>' + userid + '</strong> sucessfully created.';
			App.logServerAction(context.user.id, "Create User: " + userid);
		}
	} else if (context.post.edituser) {
		/* Edit User */
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
		/* Delete User */
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

	/* Generate HTML */
	let users = App.server.users;
	if (parts.length && parts[0]) {
		/* User data */
		let user = Text.toId(parts[0]);
		if (users[user]) {
			let html = '';
			html += '<script type="text/javascript">function deleteUser(user) {var elem = document.getElementById(\'confirm-del-\' + user);' +
				'if (elem) {elem.innerHTML = \'<form style="display:inline;" id="confirm-delete-form" method="post" action="/users/">' +
				'<input type="hidden" name="user" value="\' + user + \'" />Are you sure?&nbsp;' +
				'<input type="submit" name="deluser" value="Confirm Delete" /></form>\';}return false;}</script>';
			html += '<form id="user-form" name="user-form" method="post" action="">';
			html += '<input type="hidden" name="user" value="' + user + '" />';
			html += '<table class="user-table">';
			html += '<tr><td><strong>ID</strong><td><td>' + users[user].id + '</td></tr>';
			html += '<tr><td><strong>Name</strong><td><td><input name="username" value="' +
				users[user].name + '" type="text" size="50" /></td></tr>';
			html += '<tr><td><strong>Group</strong><td><td><input name="usergroup" value="' +
				users[user].group + '" type="text" size="50" /></td></tr>';
			html += '<tr><td colspan="2"><strong>Permissions</strong></td></tr>';
			html += '</table>';
			html += '<div style="padding:10px;">';
			for (let i in App.server.permissions) {
				html += '<div class="user-perm-option">';
				html += '<input name="perm-' + i + '" type="checkbox" value="true"' +
					(users[user].permissions[i] ? 'checked="checked"' : '') + ' />';
				html += '&nbsp;<strong>' + i + '</strong>&nbsp;(' + App.server.permissions[i].desc + ')';
				html += '</div>';
			}
			html += '</div>';
			html += '<p><input type="submit" name="edituser" value="Save Changes" /></p>';
			html += '</form>';
			html += '<p><button onclick="deleteUser(\'' + user + '\')">Delete User</button>&nbsp;<span id=\'confirm-del-' +
				user + '\'></span></p>';

			if (error) {
				html += '<p style="padding:5px;"><span class="error-msg">' + error + '</span></p>';
			} else if (ok) {
				html += '<p style="padding:5px;"><span class="ok-msg">' + ok + '</span></p>';
			}

			context.endWithWebPage(html, {title: 'User ' + user + ' - Showdown ChatBot'});
		} else {
			context.endWithWebPage('<h1>User Not Found</h1><p>The user <b>' + user + '</b> was not found</p>', {title: 'User not found'});
		}
	} else {
		/* Users List */
		let html = '';
		html += '<script type="text/javascript">function deleteUser(user) {var elem = document.getElementById(\'confirm-del-\' + user);' +
			'if (elem) {elem.innerHTML = \'<form style="display:inline;" id="confirm-delete-form" method="post" action="/users/">' +
			'<input type="hidden" name="user" value="\' + user + \'" />Are you sure?&nbsp;' +
			'<input type="submit" name="deluser" value="Confirm Delete" /></form>\';}return false;}</script>';

		html += '<h2>Users List</h2>';
		html += '<table class="userlist" width="900" border="1">';
		html += '<tr><td width="150"><div align="center"><strong>ID</strong></div></td>' +
			'<td width="200"><div align="center"><strong>Name</strong></div></td>' +
			'<td width="200"><div align="center"><strong>Group</strong></div></td>' +
			'<td width="350"><div align="center"><strong>Options</strong></div></td></tr>';
		for (let u in users) {
			let target = users[u];
			html += '<tr>';
			html += '<td>' + target.id + '</td>';
			html += '<td>' + target.name + '</td>';
			html += '<td>' + (target.group || '-') + '</td>';
			html += '<td><a href="/users/' + u + '"><button>Edit</button></a>&nbsp;&nbsp;<button onclick="deleteUser(\'' +
				u + '\')">Delete</button>&nbsp;<span id=\'confirm-del-' + u + '\'></span></td>';
			html += '</tr>';
		}
		html += '</table>';
		html += '<br /><hr /><br />';
		html += '<div class="newuser">';
		html += '<form id="new-user-form" name="new-user-form" method="post" action=""><table border="0">';
		html += '<tr><td><strong>ID</strong>: </td><td><label><input name="user" type="text" size="50" value="' +
			(context.post.adduser ? context.post.user : '') + '"/></label></td></tr>';
		html += '<tr><td><strong>Password</strong>: </td><td><label><input name="password" type="password" size="50" /></label></td></tr>';
		html += '<tr><td><strong>Password (confirm)</strong>: </td><td><label><input name="passwordconfirm" type="password" size="50" />' +
			'</label></td></tr>';
		html += '<tr><td><strong>Name</strong>: </td><td><label><input name="username" type="text" size="50" value="' +
			(context.post.adduser ? context.post.username : '') + '" /></label></td></tr>';
		html += '<tr><td><strong>Group</strong>: </td><td><label><input name="usergroup" type="text" size="50" value="' +
			(context.post.adduser ? context.post.usergroup : '') + '" /></label></td></tr>';
		html += '</table>';
		html += '<p><label><input type="submit" name="adduser" value="Create New User" /></label></p>';
		html += '</form>';
		html += '</div>';

		if (error) {
			html += '<p style="padding:5px;"><span class="error-msg">' + error + '</span></p>';
		} else if (ok) {
			html += '<p style="padding:5px;"><span class="ok-msg">' + ok + '</span></p>';
		}

		context.endWithWebPage(html, {title: 'Users - Showdown ChatBot'});
	}
});
