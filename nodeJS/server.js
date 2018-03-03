const http = require('http')
const moment = require('moment');
const crypt = require('./crypt')
const port = 5111


let HTTPServer = http.createServer((request, response) => {
    console.log(request, response)
}).listen(port, () => console.log('server running on port ' + port))

const io = require('socket.io').listen(HTTPServer)

let users = {}
let blocked_users = []
let messages = []
let history = 15

moment.locale('fr')

/* String Method */
String.prototype.escapeHTML = function() {
    return this
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
String.prototype.capitalize = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
}


function currentDate() {
    let date = moment()
    return {
        day: date.format('D'),
        month: date.format('M'),
        month_name: date.format('MMMM'),
        year: date.format('YYYY'),
        hour: date.format('HH'),
        min: date.format('MM'),
        sec: date.format('ss'),
        utc: date.format('ZZ'),
        timestamp: Date.now()
    }
}

/**
 * [isCommand description]
 * @param  {[String]}  msg [description]
 * @return {Boolean || Object} [description]
 */
function isCommand(msg) {
    if (msg.substring(0, 2) == '::') {
        let arr = msg.split('-')
        let cmd = arr[0].replace('::', '').trim()
        let args = arr.slice(1, arr.length).map(el => el.trim())
        return { cmd: cmd, args: args }
    } else {
        return false
    }
}

/* Command execute inside the chat */
function clearChat(history) {
    if (history === undefined) messages = []
    io.sockets.emit('clearMessage')
    console.log('Chat effacé')
    return 'Le chat a bien été effacé'
}

function rename(old_, new_) {
    let feedback
    for (let id in users) {
        user = users[id]
        if (user.name === old_) {
            feedback = '"' + user.name + '" a été renommé en "' + new_ + '"'
            console.log(feedback);
            user.name = new_
            io.sockets.emit('userList', crypt.crypt(users))
        } else {
            feedback = 'Erreur en renommant "' + old_ + '" en "' + new_ + '"'
            console.log(feedback);
        }
    }
    return feedback
}

function stopServer() {
    HTTPServer.close()
    return 'Le serveur a bien été arreté'
}

/**
 * Fontion bloquant l'accès au chat à un/des utilisateurs
 * @param  {String} user user.name
 * @return {None}
 */
function blockUser(user) {
    if (!blocked_users.includes(user.toLowerCase())) {
        blocked_users.push(user.toLowerCase())
    }
    console.log(`${user} à été bloqué`);
    io.sockets.emit('user_block', crypt.crypt(user))
    return `${user} à été bloqué`
}

function help() {
    return '::function -param1 -param2 ... <br> [clear, rename, stopServer, help, block]'
}

function execCommand(cmd, ...args) {
    switch (cmd) {
        case 'clear':
            return clearChat(args[0])
            break
        case 'rename':
            return rename(args[0], args[1])
            break
        case 'stopServer':
            return stopServer()
            break
        case 'help':
            return help()
            break
        case 'block':
            return blockUser(args[0])
            break
        default:
            return 'Commande non reconnue'
    }

}


io.on('connection', socket => {
    let time = new Date()
    let user = false
    if (HTTPServer.listening) {
        io.sockets.emit('userList', crypt.crypt(users))
        socket.on('login', infos => {
            infos = crypt.decrypt(infos)
            user = infos // { name: 'NameTest', mail: 'mail@test.fr' }
            user.id = user.mail.replace('@', '-').replace('.', '-')
            user.avatar = ''
            user.state = 'online'
            user.ip = socket.request.connection._peername.address + ':' + socket.request.connection._peername.port
            user.avatar = 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/156381/profile/profile-80.jpg'
            users[user.id] = user
            if (blocked_users.includes(user.name)) {
                socket.emit('loginError', crypt.crypt(user))
            } else {
                socket.emit('loginSuccess', crypt.crypt(user))
                io.sockets.emit('userList', crypt.crypt(users))
                for (k in messages) {
                    socket.emit('newMsg', crypt.crypt(messages[k]))
                }
                console.log('"' + user.name + '" connecté avec l\'id "' + user.id + '"')
            }

        })

        socket.on('disconnect', () => {
            if (!user) return false
            console.log('"' + user.name + '" avec l\'id "' + user.id + '" s\'est déconnecté')
            delete users[user.id]
            io.sockets.emit('userList', crypt.crypt(users))
        })

        socket.on('newMsg', msg => {
            msg = crypt.decrypt(msg)
            msg.user = user
            msg.date = currentDate()
            msg.state = 'send'
            msg.message = msg.message.escapeHTML()
            let command = isCommand(msg.message)
            if (command) {
                let content = execCommand(command.cmd, ...command.args)
                io.sockets.emit('chatInfo', crypt.crypt(content))
            } else {
                messages.push(msg)
                if (messages.length >= history) messages.shift()
                io.sockets.emit('newMsg', crypt.crypt(msg))
            }
        })
    }

})