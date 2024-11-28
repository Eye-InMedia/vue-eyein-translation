export default class SimpleMarkdownParser {
    constructor(str) {
        this.str = str;
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
        this.str = this.str
            .replace(/\*\*(.+?)\*\*/g, `<strong>$1</strong>`) // bold
            .replace(/\*(.+?)\*/g, `<em>$1</em>`) // italic
            .replace(/_(.+?)_/g, `<u>$1</u>`) // underline
            .replace(/~~(.+?)~~/g, `<s>$1</s>`) // strikethrough
            .replace(/--(.+?)--/g, `<s>$1</s>`) // strikethrough
            .replace(/\^(.+?)\^/g, `<sup>$1</sup>`) // superscript / exponent
            .replace(/~(.+?)~/g, `<sub>$1</sub>`) // subscript
            .replace(/==(.+?)==/g, `<mark>$1</mark>`) // highlight
            .replace(/\.\[(.+?)]\((.+?)\)/g, `<span class="$2">$1</span>`) // classes
            .replace(/#\[(.+?)]\((.+?)\)/g, `<span id="$2">$1</span>`) // id
            .replace(/\[(.+?)]\((.+?)\)/g, `<a href="$2" target="${options.linkTarget}">$1</a>`) // link
    }

    parse(options) {
        this.#sanitizeHTML(options);
        this.#renderEscapedCharacter(options);
        this.#convertMarkdownToHTML(options);

        return this.str;
    }
}
