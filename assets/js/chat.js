function updateScrollbar() {
    $messages.animate({ scrollTop: $messages.prop('scrollHeight') }, 100)
}

function setDate(date) {
    $('<div class="timestamp">' + date.hour + ':' + date.min + '</div>').appendTo($('.message:last'))
}

function insertMessage(msg) {
    $('<div class="message message-personal">' + msg.message + '</div>').appendTo($messages).addClass('new')
    setDate(msg.date)
    $('.message-input').val(null).focus()
    updateScrollbar()
}

function insertInfo(info) {
    $('<div class="message-info">' + info + '</div>').appendTo($messages).addClass('new')
    $('.message-input').val(null).focus()
    updateScrollbar()
}

$('.message-submit').click(function() {
    let message = $('.message-input').val()
    submitMessage(message)
})

$('.message-box').on('click', e => {
    $('.message-input').focus()
})

$(window).on('keydown', function(e) {
    if (e.which == 13) {
        submitMessage($('.message-input').val())
        return false
    }
})

function submitMessage(msg) {
    if ($.trim(msg) == '') {
        return false
    }
    socket.emit('newMsg', crypt({
        message: msg,
        state: 'sending',
        type: 'text/plain'
    }))
}

function submitImage(infos) {
    console.log(infos);
}

function reply(msg, user = self) {
    let message = `<div class="message">
        <figure class="avatar">
            <img src="${msg.user.avatar}" /></figure>
        <span class="msg-user">${msg.user.name}</span>
        <span class="msg-content">${msg.message}</span>
    </div>`
    $(message).appendTo($messages).addClass('new')
    setDate(msg.date)
    updateScrollbar()
}

function getMimetype(signature) {
    switch (signature) {
        case '89504E47':
            return 'image/png'
        case '47494638':
            return 'image/gif'
        case '25504446':
            return 'application/pdf'
        case 'FFD8FFDB':
        case 'FFD8FFE0':
        case 'FFD8FFE1':
            return 'image/jpeg'
        case '504B0304':
            return 'application/zip'
        default:
            return 'Unknown filetype'
    }
}

function sendImage(event) {
    const file = event.target.files[0]
    const filereader = new FileReader()
    let result;


    filereader.onloadend = function(evt) {
        if (evt.target.readyState === FileReader.DONE) {
            const uint = new Uint8Array(evt.target.result)
            let bytes = []
            uint.forEach(byte => {
                bytes.push(byte.toString(16))
            })
            const hex = bytes.join('').toUpperCase()
            result = {
                filename: file.name,
                filetype: file.type ? file.type : 'Unknown/Extension missing',
                binaryFileType: getMimetype(hex),
                hex: hex,
                data: filereader.result
            }

            submitImage(result)

        }
    }
    const blob = file.slice(0, 4);
    filereader.readAsArrayBuffer(blob);
}