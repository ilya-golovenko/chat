
var Users = (function() {
    'use strict';

    var $users = {
        'walrus': { name: 'Walrus', gender: 'male', status: { type: 'join', text: 'ВХОД В ЧАТ' }, access: 1000 },
        'alter': { name: 'Alter', gender: 'male', status: { text: 'ON-LINE' } },
        'alexxx': { name: 'AleXXX', gender: 'female', status: { type: 'away', text: 'AWAY: 14:35' } },
        'simplyuser': { name: 'SimplyUser', gender: 'female', status: { text: 'ON-LINE' } },
        'anotheruser': { name: 'AnotherUser', gender: 'male', status: { type: 'lost', text: 'НЕТ СВЯЗИ' } },
        'somelongusername': { name: 'SomeLongUserName', gender: 'female', status: { text: 'ON-LINE' } }
    };

    var $passwords = {
        'walrus': 'test'
    };

    var $styles = {
      'walrus': { image: { url: 'res/img/users/walrus.gif', width: 84, height: 28 }, text: { color: 'purple' } },
      //'alexxx': { image: { url: 'res/img/users/alexxx.gif', width: 84, height: 28 }, text: { color: 'black' } },
      'alter': { name: { color: 'olive', font: { family: 'Arial', size: '1.25em' } }, text: { color: 'darkgreen', font: { family: 'Arial', size: '1.25em' } } }
    };

    function loadOnlineUsers() {
        var names = sessionStorage.getItem('chat.server:online-users');

        if (names) {
            names = JSON.parse(names);
        }

        return names || [];
    }

    function saveOnlineUsers(names) {
        sessionStorage.setItem('chat.server:online-users', JSON.stringify(names));
    }

    return {
        findUser: function(name) {
            name = name.toLowerCase();

            if ($users.hasOwnProperty(name)) {
                return $users[name];
            }

            return undefined;
        },

        findUserStyle: function(name) {
            name = name.toLowerCase();

            if ($styles.hasOwnProperty(name)) {
                return $styles[name];
            }

            return undefined;
        },

        loginUser: function(name, password) {
            name = name.toLowerCase();

            if ($passwords.hasOwnProperty(name)) {
                return $passwords[name] === password;
            }

            return false;
        },

        getAllUserNames: function() {
            var names = [];

            for (var name in $users) {
                if ($users.hasOwnProperty(name)) {
                    names.push(name);
                }
            }

            return names;
        },

        getOnlineUsers: function() {
            var users = [];

            var names = loadOnlineUsers();

            for (var i = 0, n = names.length; i < n; i += 1) {
                users.push($users[names[i]]);
            }

            return users;
        },

        addOnlineUser: function(name) {
            var user;

            name = name.toLowerCase();

            var names = loadOnlineUsers(),
                index = names.indexOf(name);

            if (index < 0)
            {
                names.push(name);
                saveOnlineUsers(names);
                user = $users[name];
            }

            return user;
        },

        removeOnlineUser: function(name) {
            var user;

            name = name.toLowerCase();

            var names = loadOnlineUsers(),
                index = names.indexOf(name);

            if (index >= 0) {
                names.splice(index, 1);
                saveOnlineUsers(names);
                user = $users[name];
            }

            return user;
        }
    };
})();


var Messages = (function() {
    'use strict';

    function load() {
        var messages = sessionStorage.getItem('chat.server:messages');

        if (messages) {
            messages = JSON.parse(messages);
        }

        return messages || [];
    }

    function save(messages) {
        sessionStorage.setItem('chat.server:messages', JSON.stringify(messages));
    }

    return {
        add: function(message) {
            var messages = load();

            while (messages.length >= 30) {
                messages.shift();
            }

            messages.push(message);

            save(messages);
        },

        clear: function() {
            save([]);
        },

        getAll: function() {
            return load();
        }
    };
})();


var Simulator = (function() {
    function joinUser() {
    }

    function leaveUser() {
    }

    function sendPublicMessage() {
    }

    function sendPersonalMessage() {
    }


});


var Server = (function() {
    'use strict';

    // Private constants

    var alphabet = '0123456789ABCDEF';

    // Private members

    var lastMessageNum = 0;

    // Private methods

    function getRandomNumber(min, max) {
        return Math.floor(Math.random() * (max - min)) + min;
    }

    function getRandomArrayIndex(array) {
        return Math.floor(Math.random() * array.length);
    }

    function generateSession() {
        var session = '';

        for (var i = 0; i < 32; i += 1) {
            session += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
        }

        return session;
    }

    function addUserImageStyle(message, userStyle) {
        if (typeof userStyle.image === 'object') {
            message.nameImage = userStyle.image;
        }
    }

    function addUserNameStyle(message, userStyle) {
        var style = userStyle.name || userStyle.text;

        if (typeof style === 'object') {
            message.nameStyle = style;
        }
    }

    function addUserTextStyle(message, userStyle) {
        var style = userStyle.text || userStyle.name;

        if (typeof style === 'object') {
            message.textStyle = style;
        }
    }

    function addUserStyle(message, username) {
        var userStyle = Users.findUserStyle(username);

        if (userStyle) {
            switch (message.subtype) {
                case 'public':
                    addUserImageStyle(message, userStyle);
                    addUserNameStyle(message, userStyle);
                    addUserTextStyle(message, userStyle);
                    break;

                case 'personal':
                    addUserTextStyle(message, userStyle);
                    break;

                case 'join':
                case 'leave':
                    addUserImageStyle(message, userStyle);
                    break;
            }
        }
    }

    function publishServerEvent(event, data) {
        Chat.Events.publish('chat.server', event, data);
    }

    function sendMessage(message, username) {
        if (typeof username === 'string') {
            addUserStyle(message, username.toLowerCase());
        }

        if (message.subtype !== 'system') {
            Messages.add(message);
        }

        var session = sessionStorage.getItem('chat.server:user.session');

        if (session) {
            publishServerEvent('message', message);
        }
    }

    function addOnlineUser(username) {
        var user = Users.addOnlineUser(username);

        if (typeof user === 'object') {
            publishServerEvent('users.join', user);

            sendJoinMessage(user.name);
        }
    }

    function removeOnlineUser(username) {
        var user = Users.removeOnlineUser(username);

        if (typeof user === 'object') {
            publishServerEvent('users.leave', user);

            sendLeaveMessage(user.name);
        }
    }

    function sendJoinMessage(username) {
        var message = {
            subtype: 'join',
            username: username,
            timestamp: Date.now(),
            text: 'Greetings to %username% who has just joined the chat room'
        };

        sendMessage(message, username);
    }

    function sendLeaveMessage(username) {
        var message = {
            subtype: 'leave',
            username: username,
            timestamp: Date.now(),
            text: '%username% has left the chat room'
        };

        sendMessage(message, username);
    }

    function sendUserList() {
        publishServerEvent('users', Users.getOnlineUsers());
    }

    function sendHistory() {
        var messages = Messages.getAll();

        if (messages.length > 0) {
            publishServerEvent('messages', messages);
        }
    }

    function processCommonMessage(message) {
        var username = sessionStorage.getItem('chat.server:user.name');

        message.username = message.username || username;
        message.timestamp = Date.now();
        message.sender = true;

        sendMessage(message, username);
    }

    function processSystemMessage(message) {
        var username = sessionStorage.getItem('chat.server:user.name');

        message.username = username;

        sendMessage(message);
    }

    function sendRandomMessage() {
        var users = Users.getOnlineUsers();

        if (users.length > 0)
        {
            var index = getRandomArrayIndex(users),
                username = users[index].name;

            if (username.toLowerCase() !== 'walrus') {
                var random = Math.random(),
                    personal = random > 0.9,
                    direct = random < 0.5;

                if (users.length === 1) {
                    personal = false;
                    direct = false;
                }

                var message = {
                    subtype: 'public',
                    username: username,
                    timestamp: Date.now(),
                    text: 'This is a ' + (personal ? 'personal' : 'public') + ' message #' + lastMessageNum++
                };

                if (personal) {
                    message.subtype = 'personal';
                } else if(direct) {
                    users.splice(index, 1);
    
                    if (users.length > 0) {
                        index = getRandomArrayIndex(users);
                        message.text = users[index].name + ': ' + message.text;
                    }
                }

                sendMessage(message, username);
            }
        }

        setTimeout(sendRandomMessage, getRandomNumber(5000, 15000));
    }

    function addRandomOnlineUser() {
        if (Math.random() > 0.3) {
            var usernames = Users.getAllUserNames(),
                index = getRandomArrayIndex(usernames),
                username = usernames[index];
  
            if (username.toLowerCase() !== 'walrus') {
                addOnlineUser(username);
            }
        }

        setTimeout(addRandomOnlineUser, getRandomNumber(10000, 30000));
    }

    function removeRandomOnlineUser() {
        if (Math.random() > 0.7) {
            var users = Users.getOnlineUsers();

            if (users.length > 0)
            {
                var index = getRandomArrayIndex(users),
                    username = users[index].name;

                if (username.toLowerCase() !== 'walrus') {
                    removeOnlineUser(username);
                }
            }
        }

        setTimeout(removeRandomOnlineUser, getRandomNumber(30000, 50000));
    }

    // Client event listeners

    Chat.Events.subscribe('chat.client', 'session.restart', function(e) {
        if (typeof e.data === 'object' &&
            typeof e.data.session === 'string') {

            var session = sessionStorage.getItem('chat.server:user.session');

            if (session === e.data.session) {
                publishServerEvent('session.started', { session: session });

                sendUserList();
                sendHistory();
            } else {
                publishServerEvent('session.error', { reason: 'invalid session' });
            }
        } else {
            publishServerEvent('session.error', { reason: 'session required' });
        }
    });

    Chat.Events.subscribe('chat.client', 'session.login', function(e) {
        if (typeof e.data === 'object' &&
            typeof e.data.username === 'string' &&
            typeof e.data.password === 'string') {

            var username = e.data.username;
            var password = e.data.password;

            if (Users.loginUser(username, password)) {
                var session = generateSession();

                sessionStorage.setItem('chat.server:user.session', session);
                sessionStorage.setItem('chat.server:user.name', username);

                addOnlineUser(username);

                publishServerEvent('session.login', { username: username, session: session });
            } else {
                publishServerEvent('session.login.error', { reason: 'invalid credentials' });
            }
        } else {
            publishServerEvent('session.login.error', { reason: 'credentials required' });
        }
    });

    Chat.Events.subscribe('chat.client', 'session.logout', function() {
        var session = sessionStorage.getItem('chat.server:user.session');
        var username = sessionStorage.getItem('chat.server:user.name');

        if (session) {
            sessionStorage.removeItem('chat.server:user.session');
            sessionStorage.removeItem('chat.server:user.name');

            removeOnlineUser(username);

            publishServerEvent('session.logout', { session: session });
        } else {
            publishServerEvent('session.logout.error', { reason: 'not logged in' });
        }
    });

    Chat.Events.subscribe('chat.client', 'message', function(e) {
        if (typeof e.data === 'object') {
            switch (e.data.subtype) {
                case 'public':
                case 'personal':
                    processCommonMessage(e.data);
                    break;

                case 'system':
                    processSystemMessage(e.data);
                    break;
            }
        }
    });

    // Initialization

    setTimeout(removeRandomOnlineUser, getRandomNumber(20000, 50000));
    setTimeout(addRandomOnlineUser, getRandomNumber(10000, 30000));
    setTimeout(sendRandomMessage, getRandomNumber(10000, 30000));
})();
