
var Chat = (function(self) {
    'use strict';

    // Private members

    var $registrations = [];

    // Private methods

    function invoke(func) {
        typeof func === 'function' && func();
    }

    function comparePriority(left, right) {
        return left.priority - right.priority;
    }

    function loadComponentSettings(registration) {
        registration.component.settings = JSON.parse(sessionStorage.getItem('chat.settings:' + registration.name) || '{}');
    }

    function saveComponentSettings(registration) {
        sessionStorage.setItem('chat.settings:' + registration.name, JSON.stringify(registration.component.settings || {}));
    }

    function initializeComponent(registration) {
        loadComponentSettings(registration);
        invoke(registration.component.initialize);
    }

    function shutdownComponent(registration) {
        invoke(registration.component.shutdown);
        saveComponentSettings(registration);
    }

    function registerComponent(registration) {
        loadComponentSettings(registration);
        $registrations.push(registration);
    }

    function findComponentName(component) {
        for (var i = 0, n = $registrations.length; i < n; i += 1) {
            if (component == $registrations[i].component) {
                return $registrations[i].name;
            }
        }

        return undefined;
    }

    function initialize() {
        $registrations.sort(comparePriority);

        for (var i = 0, n = $registrations.length; i < n; i += 1) {
            initializeComponent($registrations[i]);
        }
    }

    function shutdown() {
        $registrations.sort(comparePriority);

        for (var i = 0, n = $registrations.length; i < n; i += 1) {
            shutdownComponent($registrations[i]);
        }
    }

    // Public properties

    self.about = {
        name: 'Missio.Chat',
        version: '0.1.1'
    };

    // Public constants

    self.PRIORITY_HIGHEST = 0;
    self.PRIORITY_NORMAL  = 5;
    self.PRIORITY_LOWEST  = 10;

    // Public methods

    self.register = function(component, name, priority) {
        registerComponent({ component: component, name: 'chat:' + name, priority: priority });
    };

    self.getName = function(component) {
        var name = findComponentName(component);

        if (typeof name !== 'string') {
            throw new Error('Component is not registered: ' + component);
        }

        return name;
    };

    // Initialization

    document.addEventListener('DOMContentLoaded', initialize);
    window.addEventListener('unload', shutdown);

    return self;
})(Chat || {});


Chat.Util = (function(self) {
    'use strict';

    // Private methods

    function getTimeStampGenerator() {
        if (typeof performance === 'object' &&
            typeof performance.now === 'function') {

            return performance.now.bind(performance);
        }

        return Date.now.bind(Date);
    }

    // Public methods

    self.extend = function(target, mixin) {
        for (var key in mixin) {
            if (mixin.hasOwnProperty(key)) {
                if (typeof mixin[key] === 'object' &&
                    typeof target[key] === 'object') {

                    self.extend(target[key], mixin[key]);
                } else {
                    target[key] = mixin[key];
                }
            }
        }

        return target;
    };

    self.require = function(name, callback) {
        var head = document.getElementsByTagName("head")[0],
            script = document.createElement('script');

        script.addEventListener('load', callback);
        script.type = 'text/javascript';
        script.src = name + '.js';

        head.appendChild(script);
    };

    self.startsWith = function(text, pattern) {
        return text.substring(0, pattern.length).toLowerCase() === pattern.toLowerCase();
    };

    self.mediaQuery = function(query, callback) {
        var mq = window.matchMedia(query);
        mq.addListener(callback);
        callback(mq);
    };

    // Initialization

    self.getTimeStamp = getTimeStampGenerator();

    return self;
})(Chat.Util || {});


Chat.View = (function(self) {
    'use strict';

    // Private members

    var $templateCache = {}, $templateContent;

    // Private methods

    function importTemplateContent() {
        var template = document.querySelector('template');

        if (template !== null) {
            $templateContent = document.importNode(template.content, true);
        }
    }

    // Public methods

    self.getElement = function(id) {
        var element = document.getElementById(id);

        if (element === null) {
            throw new Error('Could not find element with id: ' + id);
        }

        return element;
    };

    self.createElement = function(tagName, className, text) {
        var element = document.createElement(tagName);

        if (typeof text === 'string') {
            element.appendChild(document.createTextNode(text));
        } else if (typeof text !== 'undefined') {
            element.appendChild(document.createTextNode(text.toString()));
        }

        if (typeof className === 'string') {
            element.className = className;
        }

        return element;
    };

    self.cloneTemplateElement = function(query) {
        if (typeof $templateContent !== 'object') {
            throw new Error('Could not find HTML template in current document');
        }

        if (!$templateCache.hasOwnProperty(query)) {
            $templateCache[query] = $templateContent.querySelector(query);
        }

        if ($templateCache[query] === null) {
            throw new Error('Could not find element in HTML template using query: ' + query);
        }

        return $templateCache[query].cloneNode(true);
    }

    self.formatTimeStamp = function(timestamp) {
        var date = new Date(timestamp),
            hours = date.getHours(),
            minutes = date.getMinutes(),
            seconds = date.getSeconds();

        hours = hours < 10 ? '0' + hours : hours;
        minutes = minutes < 10 ? '0' + minutes : minutes;
        seconds = seconds < 10 ? '0' + seconds : seconds;

        return hours + ':' + minutes + ':' + seconds;
    };

    self.disableElasticScroll = function() {
        document.body.ontouchmove = function(e) {
            e.preventDefault();
        };
    };

    self.initialize = function() {
        importTemplateContent();
    };

    self.register = function(view, name) {
        Chat.register(view, 'view.' + name, Chat.PRIORITY_HIGHEST);
    };

    // Initialization

    Chat.register(self, 'view', Chat.PRIORITY_HIGHEST);

    return self;
})(Chat.View || {});


Chat.Controller = (function(self) {
    'use strict';

    // Public methods

    self.register = function(controller, name) {
        Chat.register(controller, 'controller.' + name, Chat.PRIORITY_NORMAL);
    };

    return self;
})(Chat.Controller || {});


Chat.Events = (function(self) {
    'use strict';

    // Private members

    var $subscriptions = {};

    // Private methods

    function dispatch(listener, topic, data, async) {
        function deliver() {
            listener({ topic: topic, data: data });
        }

        if (async === true) {
            setTimeout(deliver, 0);
        } else {
            deliver();
        }
    }

    function composeTopic(component, event) {
        if (typeof component === 'object') {
            component = Chat.getName(component);
        }

        return component + ':' + event;
    }

    // Public methods

    self.publish = function(component, event, data, async) {
        if (typeof component !== 'object' && typeof component !== 'string') {
            throw new Error('Could not publish event: "component" is neither a string nor an object');
        }

        if (typeof event !== 'string' || event.length === 0) {
            throw new Error('Could not publish event: "event" is not a string or is empty');
        }

        if (data && typeof data !== 'object') {
            throw new Error('Could not publish event: "data" is not an object');
        }
 
        if (async && typeof async !== 'boolean') {
            throw new Error('Could not publish event: "async" is not a boolean');
        }

        var topic = composeTopic(component, event);

        window.console && console.debug('Events.publish(\'%s\', %o, %b)', topic, data, async);

        if ($subscriptions.hasOwnProperty(topic)) {
            for (var i = 0, n = $subscriptions[topic].length; i < n; i += 1) {
                dispatch($subscriptions[topic][i], topic, data, async);
            }
        }
    };

    self.subscribe = function(component, event, listener) {
        if (typeof component !== 'object' && typeof component !== 'string') {
            throw new Error('Could not publish event: "component" is neither a string nor an object');
        }

        if (typeof event !== 'string' || event.length === 0) {
            throw new Error('Could not publish event: "event" is not a string or is empty');
        }

        if (typeof listener !== 'function') {
            throw new Error('Could not create a subscription: "listener" is not a function');
        }

        var topic = composeTopic(component, event);

        if (!$subscriptions.hasOwnProperty(topic)) {
            $subscriptions[topic] = [];
        }

        $subscriptions[topic].push(listener);
    };

    self.unsubscribe = function(component, event, listener) {
        if (typeof component !== 'object' && typeof component !== 'string') {
            throw new Error('Could not publish event: "component" is neither a string nor an object');
        }

        if (typeof event !== 'string' || event.length === 0) {
            throw new Error('Could not publish event: "event" is not a string or is empty');
        }

        if (typeof listener !== 'function') {
            throw new Error('Could not create a subscription: "listener" is not a function');
        }

        var topic = composeTopic(component, event);

        if ($subscriptions.hasOwnProperty(topic)) {
            var index = $subscriptions[topic].indexOf(listener);

            if (index >= 0) {
                if ($subscriptions[topic][index].length > 1) {
                    $subscriptions[topic].splice(index, 1);
                } else {
                    delete $subscriptions[topic];
                }
            }
        }
    };

    return self;
})(Chat.Events || {}); 


Chat.Connection = (function(self) {
    'use strict';

    // Private members

    var $socket;

    // Private methods

    function onSocketOpen() {
        Chat.Events.publish(self, 'opened');
    }

    function onSocketError() {
        Chat.Events.publish(self, 'error');
    }

    function onSocketClose(e) {
        Chat.Events.publish(self, 'closed', e.data);

        if (!e.wasClean) {
            setTimeout(self.open, 10000);
        }
    }

    function onSocketMessage(e) {
        Chat.Events.publish(self, 'message', JSON.parse(e.data));
    }

    // Public methods

    self.open = function() {
        $socket = new WebSocket('wss://echo.websocket.org'); //TODO: move to Chat.Config.url

        $socket.onopen = onSocketOpen;
        $socket.onerror = onSocketError;
        $socket.onclose = onSocketClose;
        $socket.onmessage = onSocketMessage;

        Chat.Events.publish(self, 'opening');
    };

    self.close = function() {
        if ($socket) {
            $socket.close();
            $socket = null;
        }
    };

    self.send = function(data) {
        if ($socket && $socket.readyState === WebSocket.OPEN) {
            $socket.send(JSON.stringify(data));
        }
    };

    // Initialization

    Chat.register(self, 'connection', Chat.PRIORITY_LOWEST);

    return self;
})(Chat.Connection || {});


Chat.User = (function(self) {
    'use strict';

    // Server events listeners

    Chat.Events.subscribe('chat.server', 'user.session', function(e) {
        self.settings.session = e.data.session;
    });

    Chat.Events.subscribe('chat.server', 'user.session.error', function(e) {
        delete self.settings.name;
        delete self.settings.session;

        Chat.Events.publish(self, 'logout', e.data);
    });

    Chat.Events.subscribe('chat.server', 'user.login', function(e) {
        self.settings.name = e.data.username;
        self.settings.session = e.data.session;

        Chat.Events.publish(self, 'login', e.data);
    });

    Chat.Events.subscribe('chat.server', 'user.login.error', function(e) {
        Chat.Events.publish(self, 'login.error', e.data);
    });

    Chat.Events.subscribe('chat.server', 'user.logout', function(e) {
        delete self.settings.name;
        delete self.settings.session;

        Chat.Events.publish(self, 'logout', e.data);
    });

    Chat.Events.subscribe('chat.server', 'user.logout.error', function(e) {
        Chat.Events.publish(self, 'logout.error', e.data);
    });

    // Core events listeners

    Chat.Events.subscribe(Chat.Connection, 'opened', function() {
        var session = self.getSession();

        if (typeof session === 'string') {
            Chat.Connection.send({ component: 'chat.client', event: 'user.session', session: session });
        }
    });

    // Public methods

    self.login = function(username, password) {
        Chat.Connection.send({ component: 'chat.client', event: 'user.login', username: username, password: password });
    };

    self.logout = function() {
        Chat.Connection.send({ component: 'chat.client', event: 'user.logout' });
    };

    self.getSession = function() {
        return self.settings.session;
    };

    self.getName = function() {
        return self.settings.name;
    };

    // Initialization

    Chat.register(self, 'user', Chat.PRIORITY_HIGHEST);

    return self;
})(Chat.User || {});


Chat.Users = (function(self) {
    'use strict';

    // Private members

    var $users = {}, $count = 0;

    // Private methods

    function setUserList(users) {
        $users = {};
        $count = users.length;

        var username = Chat.User.getName();

        if (typeof username === 'string') {
            username = username.toLowerCase();
        }

        for (var i = 0; i < $count; i += 1) {
            var name = users[i].name.toLowerCase();
            users[i].self = name === username;
            $users[name] = users[i];
        }
    }

    function addUser(user) {
        var name = user.name.toLowerCase();

        if (!$users.hasOwnProperty(name)) {
            $users[name] = user;
            $count = $count + 1;

            return true;
        }

        $users[name] = user;

        return false;
    }

    function removeUser(user) {
        var name = user.name.toLowerCase();

        if ($users.hasOwnProperty(name)) {
            delete $users[name];
            $count = $count - 1;

            return true;
        }

        return false;
    }

    // Server events listeners

    Chat.Events.subscribe('chat.server', 'users', function(e) {
        setUserList(e.data);

        Chat.Events.publish(self, 'list', e.data);
        Chat.Events.publish(self, 'count', { count: $count });
    });

    Chat.Events.subscribe('chat.server', 'users.join', function(e) {
        if (addUser(e.data)) {
            Chat.Events.publish(self, 'added', e.data);
            Chat.Events.publish(self, 'count', { count: $count });
        } else {
            Chat.Events.publish(self, 'updated', e.data);
        }
    });

    Chat.Events.subscribe('chat.server', 'users.update', function(e) {
        if (addUser(e.data)) {
            Chat.Events.publish(self, 'added', e.data);
            Chat.Events.publish(self, 'count', { count: $count });
        } else {
            Chat.Events.publish(self, 'updated', e.data);
        }
    });

    Chat.Events.subscribe('chat.server', 'users.leave', function(e) {
        if (removeUser(e.data)) {
            Chat.Events.publish(self, 'removed', e.data);
            Chat.Events.publish(self, 'count', { count: $count });
        }
    });

    // Public methods

    self.getUser = function(name) {
        name = name.toLowerCase();

        if (!$users.hasOwnProperty(name)) {
            throw new Error('Could not find user with name: ' + name);
        }

        return $users[name];
    }

    // Initialization

    Chat.register(self, 'users', Chat.PRIORITY_LOWEST);

    return self;
})(Chat.Users || {});


Chat.Message = (function(self) {
    'use strict';

    // Private members

    var $handlers = {};

    // Private methods

    function prepare(message) {
        if ($handlers.hasOwnProperty(message.subtype)) {
            $handlers[message.subtype](message);
        }

        return message;
    }

    // Server events listeners

    Chat.Events.subscribe('chat.server', 'messages', function(e) {
        for (var i = 0, n = e.data.length; i < n; i += 1) {
            e.data[i] = prepare(e.data[i]);
        }

        Chat.Events.publish(self, 'list', e.data);
    });

    Chat.Events.subscribe('chat.server', 'message', function(e) {
        Chat.Events.publish(self, 'new', prepare(e.data));
    });

    // Public methods

    self.send = function(subtype, text, properties) {
        var message = {
            component: 'chat.client',
            event: 'message',
            subtype: subtype,
            text: text
        };

        if (typeof properties === 'object') {
            Chat.Util.extend(message, properties);
        }

        Chat.Connection.send(message);
    };

    self.register = function(subtype, handler) {
        $handlers[subtype] = handler;
    };

    // Initialization

    Chat.register(self, 'message', Chat.PRIORITY_LOWEST);

    return self;
})(Chat.Message || {});


Chat.Message.Public = (function(self) {
    'use strict';

    // Private methods

    function prepare(message) {
        if (message.sender !== true) {
            var username = Chat.User.getName();

            if (typeof username === 'string') {
                message.recipient = Chat.Util.startsWith(message.text, username);
            }
        }
    }

    // Public methods

    self.send = function(text) {
        Chat.Message.send('public', text);
    };

    // Initialization

    Chat.Message.register('public', prepare);

    return self;
})(Chat.Message.Public || {});


Chat.Message.Personal = (function(self) {
    'use strict';

    // Private methods

    function prepare(message) {
        message.recipient = !message.sender;
        message.personal = true;
    }

    // Public methods

    self.send = function(text, username) {
        Chat.Message.send('personal', text, { username: username });
    };

    // Initialization

    Chat.Message.register('personal', prepare);

    return self;
})(Chat.Message.Personal || {});


Chat.Message.System = (function(self) {
    'use strict';

    // Private methods

    function prepare(message) {
        switch (message.command) {
            case 'ping':
                var roundtrip = Math.round(Chat.Util.getTimeStamp() - message.timestamp);
                message.text = 'ping %username%: ' + (roundtrip / 1000).toFixed(3) + ' s';
                break;
        }
    }

    // Public methods

    self.send = function(command) {
        Chat.Message.send('system', '', { command: command });
    };

    self.ping = function() {
        Chat.Message.send('system', '', { command: 'ping', timestamp: Chat.Util.getTimeStamp() });
    };

    // Initialization

    Chat.Message.register('system', prepare);

    return self;
})(Chat.Message.System || {});


Chat.Core = (function(self) {
    'use strict';

    // Private members

    var $heartbeatTimer;

    // Private methods

    function sendHeartbeat() {
        Chat.Connection.send({ component: 'chat.client', event: 'heartbeat' });
    }

    function resetHeartbeat(restart) {
        if ($heartbeatTimer) {
            clearTimeout($heartbeatTimer);
            $heartbeatTimer = null;
        }

        if (restart === true) {
            $heartbeatTimer = setTimeout(sendHeartbeat, 15000);
        }
    }

    // Connection events listeners

    Chat.Events.subscribe(Chat.Connection, 'opened', function() {
        resetHeartbeat(true);
    });

    Chat.Events.subscribe(Chat.Connection, 'closed', function() {
        resetHeartbeat(false);
    });

    Chat.Events.subscribe(Chat.Connection, 'message', function(e) {
        Chat.Events.publish(e.data.component, e.data.event, e.data);

        resetHeartbeat(true);
    });

    // Public methods

    self.initialize = function() {
        Chat.Connection.open();
    };

    self.shutdown = function() {
        Chat.Connection.close();
    };

    // Initialization

    Chat.register(self, 'core', Chat.PRIORITY_LOWEST);

    return self;
})(Chat.Core || {});
