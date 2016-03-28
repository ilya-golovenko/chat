
function checkCapabilities() {
    'use strict';

    var successful = true,
        unsupported = [];

    if (typeof WebSocket === 'undefined') {
        unsupported.push({
            title: 'Web Socket is not supported',
            text: 'WebSocket is a protocol providing full-duplex communications channels over a single TCP connection.'
        });
    }

    if (typeof localStorage === 'undefined' ||
        typeof sessionStorage === 'undefined') {

        unsupported.push({
            title: 'Web Storage is not supported',
            text: 'Web storage is a software method and protocol used for storing persistent or temporary session data in a web browser.'
        });
    }

    if (typeof JSON !== 'object' ||
        typeof JSON.parse !== 'function' ||
        typeof JSON.stringify !== 'function') {

        unsupported.push({
            title: 'Native JSON is not supported',
            text: 'JSON is a native API for parsing and serializing information to the JSON format.'
        });
    }

    if (!('content' in document.createElement('template'))) {
        unsupported.push({
            title: 'HTML template element is not supported',
            text: 'The HTML template element is a mechanism for holding client-side content that is not to be rendered when a page is loaded but may be instantiated during runtime.'
        });
    }

    if (typeof document.documentElement.classList !== 'object' ||
        typeof document.documentElement.textContent !== 'string' ||
        typeof document.documentElement.querySelector !== 'function' ||
        typeof document.documentElement.addEventListener !== 'function') {

        unsupported.push({
            title: 'HTML DOM is not compliant with W3C specifications',
            text: 'The Document Object Model (DOM) is a language-neutral interface used to dynamically access and update the content, structure, and style of a document.'
        });
    }

    if (unsupported.length > 0) {
        successful = false;
    }

    return {
        successful: successful,
        unsupported: unsupported
    };
}

function createMessageDetails(capabilities) {
    'use strict';

    var fragment = document.createDocumentFragment();

    for (var i = 0, n = capabilities.length; i < n; i += 1) {
        var title = document.createElement('span'),
            text = document.createElement('span');

        title.appendChild(document.createTextNode(capabilities[i].title));
        text.appendChild(document.createTextNode(capabilities[i].text));

        title.className = 'title';
        text.className = 'text';

        title.appendChild(text);
        fragment.appendChild(title);
    }

    return fragment;
}

function showUpdateMessage(capabilities) {
    'use strict';

    var message = document.getElementById('update-message'),
        header = document.getElementById('details-header'),
        content = document.getElementById('details-content');

    content.appendChild(createMessageDetails(capabilities));

    header.onclick = function() {
        header.className = 'hidden';
        content.className = '';
    };

    message.className = '';
}

function checkPrerequisites() {
    'use strict';

    var result = checkCapabilities();

    if (result.successful) {
        window.location.replace('login.html');
    } else {
        showUpdateMessage(result.unsupported);
    }
}
