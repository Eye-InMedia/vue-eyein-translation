export default class SimpleMarkdownParser {
    constructor(str, attributes) {
        this.str = str;
        this.attributes = attributes;
    }

    #sanitizeHTML(options) {
        this.str = this.str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
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

        const allMatches = result.matchAll(/\/!\/\((\d+)\)\/!\//g);
        for (const matches of allMatches) {
            const number = matches[1];
            let replacement = ``;

            if (this.attributes.hasOwnProperty(`id:${number}`)) {
                replacement += ` id="${this.attributes[`id:${number}`]}"`;
            }

            if (this.attributes.hasOwnProperty(`class:${number}`)) {
                replacement += ` class="${this.attributes[`class:${number}`]}"`;
            }

            result = result.replaceAll(matches[0], replacement);
        }

        if (this.attributes.hasOwnProperty(`class:_`)) {
            result = result.replaceAll(`<span>`, `<span class="${this.attributes[`class:_`]}">`);
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
