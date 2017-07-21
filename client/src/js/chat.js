
(function() {
    'use strict';


// validate session

if (!Chat.Session.IsValid) {
    return window.location.replace('login.html');
}


// views

Chat.View.Users = (function(self) {
    'use strict';

    // Private constants

    var MAX_SHORT_USER_NAME = 12;

    // Private members

    var $userlist, $content, $count, $connection;

    // Private event listeners

    function onUserInfoClick(username) {
        Chat.Events.publish(self, 'info.clicked', { username: username });
    }

    function onUserNameClick(username, personal) {
        Chat.Events.publish(self, 'name.clicked', { username: username, personal: personal });
    }

    // Private methods

    function fillGender(user, element) {
        element.addEventListener('click', onUserInfoClick.bind(null, user.name));
        element.classList.add(user.gender);
    }

    function fillPersonal(user, element) {
        if (!Chat.Session.isSelf(user.name)) {
            element.addEventListener('click', onUserNameClick.bind(null, user.name, true));
        }
    }

    function fillName(user, element) {
        if (!Chat.Session.isSelf(user.name)) {
            element.addEventListener('click', onUserNameClick.bind(null, user.name, false));
        }

        if (user.name.length > MAX_SHORT_USER_NAME) {
            element.classList.add('long');
        }

        element.textContent = user.name;
    }

    function fillAccess(user, element) {
        if (typeof user.access === 'number') {
            element.textContent = user.access;
        }
    }

    function fillStatus(user, element) {
        element.classList.add(user.status.type);
        element.textContent = user.status.text;
    }

    function createUserElement(user) {
        var element = Chat.View.cloneTemplateElement('.user');

        element.setAttribute('data-username', user.name.toLowerCase());

        fillGender(user, element.querySelector('.gender'));
        fillPersonal(user, element.querySelector('.personal'));
        fillName(user, element.querySelector('.name'));
        fillAccess(user, element.querySelector('.access'));
        fillStatus(user, element.querySelector('.status'));

        if (Chat.Session.isSelf(user.name)) {
            element.classList.add('self');
        }

        return element;
    }

    function getUserElement(user) {
        return $content.querySelector('span[data-username="' + user.name.toLowerCase() + '"]');
    }

    function showView() {
        $userlist.classList.remove('hidden');
    };

    function hideView() {
        $userlist.classList.add('hidden');
    };

    function autoHideView() {
        $userlist.classList.add('autohide');

        setTimeout(function() {
            $userlist.classList.add('hidden');
        }, 0);

        $userlist.addEventListener('mouseenter', showView);
        $userlist.addEventListener('mouseleave', hideView);
        $userlist.addEventListener('blur', hideView, true);
    }

    function noAutoHideView() {
        $userlist.classList.remove('hidden');

        setTimeout(function() {
            $userlist.classList.remove('autohide');
        }, 500);

        $userlist.removeEventListener('mouseenter', showView);
        $userlist.removeEventListener('mouseleave', hideView);
        $userlist.removeEventListener('blur', hideView, true);
    }

    // Public methods

    self.initialize = function() {
        $userlist = Chat.View.getElement('userlist');
        $content = $userlist.querySelector('.content');
        $count = $userlist.querySelector('.count .value');
        $connection = $userlist.querySelector('.connection');
    };

    self.addUser = function(user) {
        $content.appendChild(createUserElement(user));
    };

    self.removeUser = function(user) {
        $content.removeChild(getUserElement(user));
    };

    self.updateUser = function(user) {
        $content.replaceChild(createUserElement(user), getUserElement(user));
    };

    self.setUserList = function(users) {
        var content = $content.cloneNode(false);

        for (var i = 0, n = users.length; i < n; i += 1) {
            content.appendChild(createUserElement(users[i]));
        }

        $content.parentNode.replaceChild(content, $content);

        $content = content;
    };

    self.clearUserList = function() {
        var content = $content.cloneNode(false);

        $content.parentNode.replaceChild(content, $content);

        $content = content;
    };

    self.setCount = function(count) {
        $count.textContent = count.toString();
    };

    self.setConnectionClosed = function() {
        $connection.title = 'Connection lost';
        $connection.classList.add('lost');
        $connection.classList.add('blink')
        $connection.classList.remove('open');
    };

    self.setConnectionOpening = function() {
        $connection.title = 'Connecting...';
        $connection.classList.add('open');
        $connection.classList.add('blink');
        $connection.classList.remove('lost');
    };

    self.setConnectionOpened = function() {
        $connection.title = 'Connected';
        $connection.classList.add('open');
        $connection.classList.remove('lost');
        $connection.classList.remove('blink');
    };

    // Public properties

    Object.defineProperty(self, 'AutoHide', {
        get: function() {
            return $userlist.classList.contains('autohide');
        },
        set: function(value) {
            value === true ? autoHideView() : noAutoHideView();
        }
    });

    // Initialization

    Chat.View.register(self, 'users');

    return self;
})(Chat.View.Users || {});


Chat.View.Input = (function(self) {
    'use strict';

    // Private constants

    var UP_KEY = 38,
        DOWN_KEY = 40,
        ESC_KEY = 27,
        MAX_MESSAGES = 50;

    // Private members

    var $username, $message, $clear, $exit, $messages, $current;

    // Private methods

    function minimizeView() {
        $username.classList.add('hidden');
        $clear.classList.add('hidden');
        $exit.classList.add('hidden');
    }

    function maximizeView() {
        $username.classList.remove('hidden');
        $clear.classList.remove('hidden');
        $exit.classList.remove('hidden');
    }

    // Public methods

    self.initialize = function() {
        var $input = Chat.View.getElement('input');

        $username = Chat.View.getElement('username');
        $message = Chat.View.getElement('message');
        $clear = Chat.View.getElement('clear');
        $exit = Chat.View.getElement('exit');

        $username.value = self.settings.username || '';
        $message.value = self.settings.message || '';

        $messages = self.settings.messages || [];
        $current = self.settings.current || 0;

        $username.addEventListener('click', function(e) {
            e.preventDefault();
            $input.reset();
        });

        $username.addEventListener('focus', function(e) {
            e.preventDefault();
            $message.focus();
        });

        $message.addEventListener('keydown', function(e) {
            switch (e.keyCode) {
                case UP_KEY:
                    if ($current + 1 < $messages.length) {
                        $message.value = $messages[$current += 1];
                    }
                    break;

                case DOWN_KEY:
                    if ($current > 0) {
                        $message.value = $messages[$current -= 1];
                    }
                    break;

                case ESC_KEY:
                    $message.value = '';
                    break;

                default:
                    return;
            }

            e.preventDefault();
        });

        $input.addEventListener('submit', function(e) {
            e.preventDefault();

            var message = $message.value.trim(),
                username = $username.value.trim();

            if (message.length !== 0) {
                $current = 0;

                if ($messages.length < 2 || $messages[1] !== message) {
                    if ($messages.length > MAX_MESSAGES) {
                        $messages.pop();
                    }

                    $messages.splice(0, 1, '', message);
                }

                var data = { message: message };

                if (username.length !== 0) {
                    data.username = username;
                }

                Chat.Events.publish(self, 'submitted', data);
            }

            $message.value = '';
            $message.focus();
        });

        $input.addEventListener('reset', function() {
            $message.focus();
        });

        $exit.addEventListener('click', function() {
            Chat.Events.publish(self, 'exit.clicked');
        });
    };

    self.shutdown = function() {
        self.settings.username = $username.value;
        self.settings.message = $message.value;

        self.settings.messages = $messages;
        self.settings.current = $current;
    };

    self.setEnabled = function(enabled) {
        $username.disabled = !enabled;
        $message.disabled = !enabled;

        if (enabled) {
            $message.focus();
        }
    };

    self.clearUserName = function() {
        $username.value = '';
        $message.focus();
    };

    self.setUserName = function(username) {
        $username.value = username;
        $message.focus();
    };

    self.prependMessage = function(text) {
        $message.value = text + $message.value;
        $message.focus();
    };

    self.appendMessage = function(text) {
        $message.value = $message.value + text;
        $message.focus();
    };

    // Public properties

    Object.defineProperty(self, 'Minimized', {
        get: function() {
            return $username.classList.contains('hidden');
        },
        set: function(value) {
            value === true ? minimizeView() : maximizeView();
        }
    });

    // Initialization

    Chat.View.register(self, 'input');

    return self;
})(Chat.View.Input || {});


Chat.View.Messages = (function(self) {
    'use strict';

    // Private members

    var $chat, $scroll, $content;

    // Private event listeners

    function onTimeStampClick(timestamp) {
        Chat.Events.publish(self, 'timestamp.clicked', { timestamp: timestamp });
    }

    function onUserNameClick(username, personal) {
        Chat.Events.publish(self, 'username.clicked', { username: username, personal: personal });
    }

    // Private methods

    function createUserImage(image, username) {
        var element = document.createElement('img');

        element.classList.add('username');

        element.src = image.url;
        element.width = image.width;
        element.height = image.height;
        element.title = username;
        element.alt = username;

        return element;
    }

    function applyElementStyle(element, style) {
        if (typeof style.color === 'string') {
            element.style.color = style.color;
        }

        if (typeof style.font === 'object') {
            element.style.fontFamily = style.font.family;
            element.style.fontSize = style.font.size;
        }
    }

    function fillTimeStamp(message, element) {
        if (element !== null) {
            element.textContent = Chat.View.formatTimeStamp(message.timestamp);

            element.addEventListener('click', onTimeStampClick.bind(null, message.timestamp));

            if (message.recipient === true) {
                element.classList.add('highlight');
            }
        }
    }

    function fillUserName(message, element) {
        if (element !== null) {
            element.addEventListener('click', onUserNameClick.bind(null, message.username, message.personal));

            if (typeof message.nameImage === 'object') {
                element.appendChild(createUserImage(message.nameImage, message.username));
            } else {
                element.textContent = message.username;
            }

            if (typeof message.nameStyle === 'object') {
                applyElementStyle(element, message.nameStyle);
            }
        }
    }

    function createUserName(message) {
        var element = document.createElement('span');

        element.classList.add('username');

        fillUserName(message, element);

        return element;
    }

    function fillText(message, element) {
        if (element !== null) {
            var text = message.text.split('%username%', 2);

            if (text.length === 2) {
                if (text[0].length !== 0) {
                    element.appendChild(document.createTextNode(text[0]));
                }

                element.appendChild(createUserName(message));

                if (text[1].length !== 0) {
                    element.appendChild(document.createTextNode(text[1]));
                }
            } else {
                element.textContent = message.text;
            }

            if (typeof message.textStyle === 'object') {
                applyElementStyle(element, message.textStyle);
            }
        }
    }

    function createMessageElement(message) {
        var element = Chat.View.cloneTemplateElement('.message.' + message.subtype);

        fillTimeStamp(message, element.querySelector('.timestamp'));
        fillUserName(message, element.querySelector('.username'));
        fillText(message, element.querySelector('.text'));

        if (message.recipient === true) {
            element.classList.add('received');
        }

        if (message.sender === true) {
            element.classList.add('sent');
        }

        return element;
    }

    function shouldUpdateScroll() {
        return $scroll.scrollTop === $scroll.scrollHeight - $scroll.clientHeight;
    }

    function scrollToBottom() {
        $scroll.scrollTop = $scroll.scrollHeight;
    }

    // Public methods

    self.initialize = function() {
        $chat = Chat.View.getElement('chat');
        $scroll = $chat.querySelector('.inner');
        $content = $chat.querySelector('.content');
    };

    self.addMessage = function(message) {
        var updateScroll = shouldUpdateScroll();

        $content.appendChild(createMessageElement(message));

        if (updateScroll === true) {
            scrollToBottom();
        }
    };

    self.setMessages = function(messages) {
        var updateScroll = shouldUpdateScroll(),
            content = $content.cloneNode(false);

        for (var i = 0, n = messages.length; i < n; i += 1) {
            content.appendChild(createMessageElement(messages[i]));
        }

        $content.parentNode.replaceChild(content, $content);

        $content = content;

        if (updateScroll === true) {
            scrollToBottom();
        }
    }

    // Initialization

    Chat.View.register(self, 'chat');

    return self;
})(Chat.View.Messages || {});


// controllers

Chat.Controller.Chat = (function(self) {
    'use strict';

    // Core events listeners

    Chat.Events.subscribe(Chat.Connection, 'opening', function() {
        Chat.View.Users.setConnectionOpening();
        Chat.View.Input.setEnabled(false);
    });

    Chat.Events.subscribe(Chat.Connection, 'opened', function() {
        Chat.View.Users.setConnectionOpened();
        Chat.View.Input.setEnabled(true);
    });

    Chat.Events.subscribe(Chat.Connection, 'closed', function() {
        Chat.View.Users.setConnectionClosed();
        Chat.View.Input.setEnabled(false);
    });

    Chat.Events.subscribe(Chat.Session, 'logout', function(e) {
        window.location.replace('login.html');
    });

    Chat.Events.subscribe(Chat.Message, 'list', function(e) {
        Chat.View.Messages.setMessages(e.data);
    });

    Chat.Events.subscribe(Chat.Message, 'new', function(e) {
        Chat.View.Messages.addMessage(e.data);
    });

    Chat.Events.subscribe(Chat.Users, 'list', function(e) {
        Chat.View.Users.setUserList(e.data);
    });

    Chat.Events.subscribe(Chat.Users, 'count', function(e) {
        Chat.View.Users.setCount(e.data.count);
    });

    Chat.Events.subscribe(Chat.Users, 'added', function(e) {
        Chat.View.Users.addUser(e.data);
    });

    Chat.Events.subscribe(Chat.Users, 'removed', function(e) {
        Chat.View.Users.removeUser(e.data);
    });

    Chat.Events.subscribe(Chat.Users, 'updated', function(e) {
        Chat.View.Users.updateUser(e.data);
    });

    // Users view events listeners

    Chat.Events.subscribe(Chat.View.Users, 'name.clicked', function(e) {
        if (e.data.personal === true) {
            Chat.View.Input.setUserName(e.data.username);
        } else {
            Chat.View.Input.clearUserName();
            Chat.View.Input.prependMessage(e.data.username + ': ');
        }
    });

    Chat.Events.subscribe(Chat.View.Users, 'info.clicked', function(e) {
        //TODO: implement!
        //Chat.View.UserInfo.show(e.username);
    });

    Chat.Events.subscribe(Chat.View.Users, 'personal.clicked', function(e) {
        Chat.View.Input.setUserName(e.data.username);
    });

    // Input view events listeners

    Chat.Events.subscribe(Chat.View.Input, 'submitted', function(e) {
        if (e.data.message.charAt(0) === '/') {
            var command = e.data.message.substring(1);

            switch (command) {
                case 'ping':
                    Chat.Message.System.ping();
                    break;

                case 'autohide':
                    Chat.View.Users.AutoHide = self.settings.autohide = true;
                    break;

                case 'noautohide':
                    Chat.View.Users.AutoHide = self.settings.autohide = false;
                    break;
            }
        } else {
            if (typeof e.data.username === 'string') {
                Chat.Message.Personal.send(e.data.message, e.data.username);
            } else {
                Chat.Message.Public.send(e.data.message);
            }
        }
    });

    Chat.Events.subscribe(Chat.View.Input, 'exit.clicked', function() {
        Chat.Session.logout();
    });

    // Chat view events listeners

    Chat.Events.subscribe(Chat.View.Messages, 'timestamp.clicked', function(e) {
        Chat.View.Input.appendMessage(' ' + Chat.View.formatTimeStamp(e.data.timestamp) + ' ');
    });

    Chat.Events.subscribe(Chat.View.Messages, 'username.clicked', function(e) {
        if (e.data.personal === true) {
            Chat.View.Input.setUserName(e.data.username);
        } else {
            Chat.View.Input.clearUserName();
            Chat.View.Input.prependMessage(e.data.username + ': ');
        }
    });

    // Public methods

    self.initialize = function() {
        Chat.Util.mediaQuery('(max-width: 50em)', function(mq) {
            Chat.View.Users.AutoHide = mq.matches || self.settings.autohide;
            Chat.View.Input.Minimized = mq.matches || self.settings.minimized;
        });

        Chat.View.disableElasticScroll();
    };

    // Initialization

    Chat.Controller.register(self, 'chat');

    return self;
})(Chat.Controller.Chat || {});


})();
