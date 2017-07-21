
(function() {
    'use strict';


// validate session

if (Chat.Session.IsValid) {
    return window.location.replace('chat.html');
}


// views

Chat.View.Login = (function(self) {

    // Private members

    var $username, $password, $progress, $status, $submit;

    // Public methods

    self.initialize = function() {
        var $login = Chat.View.getElement('login');

        $username = Chat.View.getElement('username');
        $password = Chat.View.getElement('password');
        $progress = Chat.View.getElement('progress');
        $status = Chat.View.getElement('status');
        $submit = Chat.View.getElement('submit');

        $username.value = self.settings.username || '';
        $password.value = self.settings.password || '';

        $login.addEventListener('submit', function(e) {
            e.preventDefault();

            var username = $username.value.trim(),
                password = $password.value.trim();

            if (username.length !== 0 && password.length !== 0) {
                Chat.Events.publish(self, 'submitted', { username: username, password: password });
            }
        });
    };

    self.shutdown = function() {
        self.settings.username = $username.value;
        self.settings.password = $password.value;
    };

    self.setStatus = function(text, color) {
        $status.textContent = text;
        $status.style.color = color;
    };

    self.setEnabled = function(enabled) {
        $username.disabled = !enabled;
        $password.disabled = !enabled;
        $submit.disabled = !enabled;

        if (enabled) {
            $username.focus();
        }
    };

    self.showProgress = function(show) {
        $progress.style.display = show ? 'inline' : 'none';
    };

    // Initialization

    Chat.View.register(self, 'login');

    return self;
})(Chat.View.Login || {});


// controllers

Chat.Controller.Login = (function(self) {
    // Private methods

    function redirectToChat() {
        window.location.replace('chat.html');
    }

    function updateLoginView(enabled, progress, statusText, statusColor) {
        Chat.View.Login.setEnabled(enabled);
        Chat.View.Login.showProgress(progress);

        if (typeof statusText === 'string') {
            Chat.View.Login.setStatus(statusText, statusColor || '');
        }
    }

    // Core events listeners

    Chat.Events.subscribe(Chat.Connection, 'opening', function() {
        updateLoginView(false, true, 'Connecting to chat server...');
    });

    Chat.Events.subscribe(Chat.Connection, 'opened', function() {
        updateLoginView(true, false, 'Connected to chat server');
    });

    Chat.Events.subscribe(Chat.Connection, 'error', function() {
        updateLoginView(false, true, 'Could not connect to chat server', 'darkred');
    });

    Chat.Events.subscribe(Chat.Session, 'login', function() {
        updateLoginView(false, false, 'Logged in to chat server');
        setTimeout(redirectToChat, 1000);
    });

    Chat.Events.subscribe(Chat.Session, 'login.error', function(e) {
        updateLoginView(true, false, 'Could not login to chat server: ' + e.data.reason, 'darkred');
    });

    // View events listeners

    Chat.Events.subscribe(Chat.View.Login, 'submitted', function(e) {
        updateLoginView(false, false, 'Logging in to chat server...');
        Chat.Session.login(e.data.username, e.data.password);
    });

    // Public methods

    self.initialize = function() {
        Chat.View.disableElasticScroll();
    };

    // Initialization

    Chat.Controller.register(self, 'login');

    return self;
})(Chat.Controller.Login || {});


})();
