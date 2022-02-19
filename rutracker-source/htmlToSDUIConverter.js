const probe = require('probe-image-size')
const logger = require('../logger').logger

class Image {
    type = 'image'
    constructor(url, width, height) {
        this.url = url
        this.width = width
        this.height = height
    }
}

class Text {
    type = 'text'
    constructor(text, fontWeight) {
        this.text = text
        this.fontWeight = fontWeight
    }
}

class Column {
    type = 'column'
    constructor(children) {
        this.children = children
    }
}

class Row {
    type = 'row'
    constructor(children) {
        this.children = children
    }
}

class HiddenContent {
    type = 'hiddenContent'
    constructor(title, children) {
        this.title = title
        this.children = children
    }
}

class Link {
    type = "link"
    constructor(url, text) {
        this.url = url
        this.text = text
    }
}

class Divider {
    type = "divider"
}

module.exports.convert = async function (postBody) {
    const postBodyChildren = postBody[0].children
    let children = postBodyChildren[0]
    const data = []
    for (let i = 0; i < postBodyChildren.length; i++) {
        await getDataFromNode(children, data)
        children = children.next
    }

    return new Column(data)
}

async function getDataFromNode(node, root) {
    if (node.type == 'text') {
        const text = node.data.replace(/\s\s+/g, '').replace(/\n+/g, '')
        if (text != ' ' && text != '') {
            let fontWeight
            if (node.parent.attribs.class == 'post-b') {
                fontWeight = 'bold'
            } else {
                fontWeight = 'regular'
            }
            root.push(new Text(text, fontWeight))
        }
    }

    if (node.attribs != undefined && node.attribs.class != undefined) {
        if (node.attribs.class.includes('postImg')) {
            const imgUrl = node.attribs.title
            let width, height
            try {
                const img = await probe(imgUrl)
                width = img.width
                height = img.height
            } catch (e) {
                logger.debug(`image processing error: ${e}`)
                width = null
                height = null
            }

            root.push(new Image(imgUrl, width, height))
        }
        if (node.attribs.class.includes('post-hr')) {
            root.push(new Divider())
        }

    }

    if (node.children != undefined) {
        const rootChild = []
        for (const child of node.children) {
            getDataFromNode(child, rootChild)
        }
        if (rootChild.length != 0) {
            if (node.attribs.class == 'postLink') {
                let url
                if (node.attribs.href.startsWith('viewtopic.php') || node.attribs.href.startsWith('tracker.php')) {
                    url = 'https://rutracker.org/forum/' + node.attribs.href
                } else {
                    url = node.attribs.href
                }
                root.push(new Link(url, rootChild[0].text))
            } else if (node.attribs.class == 'sp-wrap') {
                const title = rootChild[0].text
                rootChild.shift()
                root.push(new HiddenContent(title, rootChild))
            } else if (rootChild.length == 1) {
                root.push(rootChild[0])
            } else {
                root.push(new Column(rootChild))
            }
        }
    }
}