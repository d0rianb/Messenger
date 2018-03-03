function crypt(data) {
    switch (typeof data) {
        case 'string':
            return cryptString(data)
            break
        case 'object':
            return cryptObject(data)
            break
        case 'number':
            return cryptNumber(data)
            break
        default:
            throw 'InvalidType'

    }
}

function cryptString(str) {
    let header = `<String ${str.length}> `
    let encode = str.split('').map(letter => letter.charCodeAt() + str.length).join(' ')
    // decrypt(header + encode)
    return header + encode
}

function cryptObject(object) {
    let obj = JSON.parse(JSON.stringify(object))
    for (let property in obj) {
        obj[property] = crypt(obj[property])
    }
    return obj
}

function cryptNumber(int) {
    let str = int.toString()
    let header = `<Number ${str.length}> `
    let encode = str.split('').map(letter => letter.charCodeAt() + str.length).join(' ')
    return header + encode
}

function decrypt(encode) {
    let type, length, data
    if (typeof encode !== 'object') {
        let header = encode.split('>')[0].replace('<', '').split(' ')
        type = header[0],
            length = parseInt(header[1], 10),
            data = encode.replace(`<${header.join(' ')}>`, '').trim()
    } else {
        type = 'Object'
        data = encode
    }

    switch (type) {
        case 'String':
            return decryptString(data, length)
            break
        case 'Number':
            return decryptNumber(data, length)
            break
        case 'Object':
            return decryptObject(data)
            break
        default:
            return 'Unknown type'
    }
}

function decryptString(encode, length) {
    let decode = encode.split(' ').map(char => String.fromCharCode(parseInt(char, 10) - length)).join('')
    return decode
}

function decryptNumber(encode, length) {
    let decode = parseInt(decryptString(encode, length), 10)
    return decode

}

function decryptObject(object) {
    let decode = JSON.parse(JSON.stringify(object))
    for (let property in decode) {
        decode[property] = decrypt(decode[property])
    }
    return decode
}