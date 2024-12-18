export default class SimpleMarkdownParser {
    constructor(str, attributes) {
        this.str = str;
        this.attributes = attributes;
    }

    #sanitizeHTML(options) {
        this.str = this.str
            .replace(/&/g, `&amp;`)
            .replace(/</g, `&lt;`)
            .replace(/>/g, `&gt;`)
            .replace(/"/g, `&quot;`)
            .replace(/'/g, `&#039;`)
            .replace(/&lt;br&gt;/g, `<br>`);
    }

    #renderEscapedCharacter(options) {
        this.str = this.str
            .replace(/\\\*/g, `&ast;`)
            .replace(/\\\*/g, `&ast;`)
            .replace(/\\_/g, `&lowbar;`)
            .replace(/\\~/g, `&sim;`)
            .replace(/\\=/g, `&equals;`)
            .replace(/\\\^/g, `&and;`);
    }

    #convertMarkdownToHTML(options) {
        let result = this.str
            .replace(/\*\*(.+?)\*\*(\(\d+\))?/g, `<strong/!/$2/!/>$1</strong>`) // bold
            .replace(/\*(.+?)\*(\(\d+\))?/g, `<em/!/$2/!/>$1</em>`) // italic
            .replace(/__(.+?)__(\(\d+\))?/g, `<span/!/$2/!/>$1</span>`) // span
            .replace(/_(.+?)_(\(\d+\))?/g, `<u/!/$2/!/>$1</u>`) // underline
            .replace(/~~(.+?)~~(\(\d+\))?/g, `<s/!/$2/!/>$1</s>`) // strikethrough
            .replace(/--(.+?)--(\(\d+\))?/g, `<s/!/$2/!/>$1</s>`) // strikethrough alternative
            .replace(/\^(.+?)\^/g, `<sup>$1</sup>`) // superscript / exponent
            .replace(/~(.+?)~/g, `<sub>$1</sub>`) // subscript
            .replace(/==(.+?)==/g, `<mark>$1</mark>`) // highlight
            .replace(/\[(.+?)]\((.+?)\)/g, `<a href="$2" target="${options.linkTarget}">$1</a>`) // link

        result = result.replace(/\/!\/\/!\//g, ``);

        let opts = {
            id: {},
            class: {}
        };
        for (const attr in this.attributes) {
            const tmp = attr.split(`.`);
            const attributeName = tmp.shift();

            if (![`class`, `id`].includes(attributeName)) {
                continue;
            }

            for (const number of tmp) {
                if (!opts[attributeName].hasOwnProperty(number)) {
                    opts[attributeName][number] = this.attributes[attr];
                } else {
                    opts[attributeName][number] += ` ` + this.attributes[attr];
                }
            }
        }

        const allMatches = result.matchAll(/\/!\/\((\d+)\)\/!\//g);
        for (const matches of allMatches) {
            const number = matches[1];
            let replacement = ``;

            if (opts.id.hasOwnProperty(number)) {
                replacement += ` id="${opts.id[number]}"`;
            }

            if (opts.class.hasOwnProperty(number)) {
                replacement += ` class="${opts.class[number]}"`;
            }

            result = result.replaceAll(matches[0], replacement);
        }

        if (opts.class.hasOwnProperty(`_`)) {
            result = result.replaceAll(`<span>`, `<span class="${opts.class._}">`);
        }

        this.str = result;
    }

    parse(options) {
        this.#sanitizeHTML(options);
        this.#renderEscapedCharacter(options);
        this.#convertMarkdownToHTML(options);

        return this.str;
    }
}
