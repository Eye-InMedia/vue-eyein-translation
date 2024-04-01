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
            .replace(/\*\*(.+?)\*\*/g, `<strong>$1</strong>`)
            .replace(/\*(.+?)\*/g, `<em>$1</em>`)
            .replace(/_(.+?)_/g, `<u>$1</u>`)
            .replace(/\[(.+?)]\((.+?)\)/g, `<a href="$2" target="${options.linkTarget}">$1</a>`)
            .replace(/~~(.+?)~~/g, `<s>$1</s>`)
            .replace(/\^(.+?)\^/g, `<sup>$1</sup>`)
            .replace(/~(.+?)~/g, `<sub>$1</sub>`)
            .replace(/==(.+?)==/g, `<mark>$1</mark>`);
    }

    parse(options) {
        this.#sanitizeHTML(options);
        this.#renderEscapedCharacter(options);
        this.#convertMarkdownToHTML(options);

        return this.str;
    }
}
