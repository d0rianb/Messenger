let serveur = 'http://localhost:5111' //'78.194.252.212:5111'
let mailRegex = new RegExp("^[a-zA-Z0-9éèà_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$", '')
let socket, self
let sidebar = $('.sidebar ul')
let $messages = $('.messages-content')
let fileSelector = document.querySelector('.file-selector')
let fadeDuration = 200;
let notificationAllowed = true,
    pageVisible = true,
    autoLog = true;

let hidden, visibilityChange;
if (typeof document.hidden !== "undefined") {
    hidden = "hidden";
    visibilityChange = "visibilitychange";
} else if (typeof document.webkitHidden !== "undefined") {
    hidden = "webkitHidden";
    visibilityChange = "webkitvisibilitychange";
}


String.prototype.capitalize = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
}

function login(username, email) {
    socket.emit('login', crypt({
        name: username,
        mail: email
    }))
}

function submitLogin(event) {
    event.preventDefault()
    let username = $('input[name="username"]').val()
    let email = $('input[name="email"]').val().trim()
    let error = $('p.form-error')
    $messages.html('')

    socket.on('connect_error', err => {
        error.html('La connection avec le serveur n\'a pas pu être établie')
        return false
    })

    if (username === '') {
        error.html('Il faut entrez un nom d\'utilisateur valide')
    } else if (email === '' || !email.match(mailRegex)) {
        error.html('Il faut entrez une addresse email valide')
    } else {
        error.html('')
        login(username, email)
    }
}

function createCookie(name, value, days) {
    if (days) {
        var date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        var expires = "; expires=" + date.toGMTString();
    } else {
        var expires = '';
    }
    document.cookie = name + '=' + value + expires + '; path=/';
}

function readCookie(name) {
    var nameEQ = name + "=";
    var ca = document.cookie.split(';');
    for (var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}

function eraseCookie(...name) {
    name.forEach(cookie => createCookie(cookie, "", -1))
}

function hideSettings() {
    $('.background').fadeOut(fadeDuration / 2)
    $('.settings').fadeOut(fadeDuration / 2)
}

function handleVisibilityChange() {
    if (document.hidden) {
        pageVisible = false
    } else {
        pageVisible = true
    }
}

$(window).load(() => {
    socket = io.connect(serveur)

    /* Auto-Log  */
    if (autoLog && readCookie('username') && readCookie('email')) {
        login(readCookie('username'), readCookie('email'))
    }

    /* Attach event */
    // Login
    $('#submit').on('click', e => submitLogin(e))
    $('.login').on('keydown', e => { if (e.which == 13) submitLogin(e) })

    // Settings
    $('#settings-close').on('click', e => hideSettings())
    $('#settings').on('click', e => {
        $('.background').fadeIn(fadeDuration)
        $('.settings').fadeIn(fadeDuration)
    })
    $('#changeUtil').on('click', e => {
        $('.login').fadeIn(fadeDuration)
        hideSettings()
    })

    // Sidebar
    $('.sidebar ul').on('click', '.card', e => {
        let card = $(e.currentTarget)
        let subCard = $(card[0].nextElementSibling)
        if (card.hasClass('has-sub')) {
            subCard.css('display', 'none')
            card.removeClass('has-sub')
        } else {
            subCard.css('display', 'inline-block')
            card.addClass('has-sub')
        }
    })

    /* Attach listener */
    fileSelector.addEventListener('change', event => sendImage(event))
    document.addEventListener(visibilityChange, handleVisibilityChange, false);

    /* Notification */
    if (window.Notification && Notification.permission !== "granted") {
        Notification.requestPermission(status => {
            if (Notification.permission !== status) {
                Notification.permission = status;
                notificationAllowed = status == 'granted' ? true : false
            }

        })
    }


    /* Socket.io  */
    socket.on('userList', list => {
        sidebar.html('')
        for (let id in list) {
            let user = decrypt(list[id])
            sidebar.append(`
            <div class="user">
                <li class="card">
                    <div class="card-avatar"><img src="${user.avatar}" alt="avatar" /></div>
                    <div class="card-infos">
                        <div class="info-name">${user.name}</div>
                        <div class="info-state">${user.state == 'online' ? 'En ligne' : user.state}</div>
                    </div>
                </li>
                <li class="sub-card">
                    <div class="user-id"><span class="sub-label">ID</span> : ${user.id}</div>
                    <div class="user-mail"><span class="sub-label">Mail</span> : ${user.mail}</div>
                    <div class="user-ip"><span class="sub-label">Adresse IP</span> : ${user.ip}</div>
                    <div class="user-state"><span class="sub-label">Etat</span> : ${user.state}</div>
                </li>
            </div>`)
        }
    })

    socket.on('loginSuccess', user => {
        user = decrypt(user)
        self = user
        $('.login').fadeOut(fadeDuration)
        $('.info-username').html(user.name)
        $('.message-input').focus()
        if ($('#remember').is(":checked")) {
            createCookie('username', user.name, 30)
            createCookie('email', user.mail, 30)
        } else {
            eraseCookie('username', 'email')
        }
    })

    socket.on('loginError', user => {
        user = decrypt(user)
        $('p.form-error').html('Le serveur à refusé votre connection. Vérifiez auprès de l\'administrateur que vous n\'êtes pas bloqué')
        self = false
    })

    socket.on('newMsg', msg => {
        msg = decrypt(msg)
        if ($.trim(msg) !== '') {
            if (self !== undefined) {
                if (msg.user.id == self.id) {
                    insertMessage(msg)
                } else {
                    reply(msg)
                    if (notificationAllowed && !pageVisible) {
                        let notif = new Notification(`${msg.user.name} : ${msg.message}`)
                    }
                }
            }
        }
    })

    socket.on('clearMessage', () => {
        $messages.html('')
    })

    socket.on('chatInfo', info => {
        info = decrypt(info)
        insertInfo(info)
    })

    socket.on('user_block', user => {
        user = decrypt(user)
        if (user === self.name) {
            eraseCookie('username')
            socket.disconnect()
            $('.login').fadeIn(fadeDuration)
        }
    })
});

// cmd + maj + p