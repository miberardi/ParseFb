
module.exports = class ParseFbSingleElement {

    // attributes
    page;
    debug;
    albumType;
    filename;
    logFileName;
    browser;
    page;

    // constructor
    constructor(page, albumType, debug) {
        this.page = page;
        this.albumType = albumType;
        this.debug = debug;
    }


    // methods
    getNumberWithLeadingZero(number) {
        if (number < 10) {
            number = "0" + number;
        }
        return number;
    }

    replaceUnwantedCharacters(text) {
        if (text == null) {
            return "";
        }

        // replace unwanted characters
        text = text.replace(/(?:\r\n|\r|\n)/g, ' ');
        text = text.replace(/;/g, ',');
        text = text.replace(/"/g, "'");
        text = text.replace(/\//g, "_");
        text = text.replace(/\\/g, "_");
        text = text.replace(/:/g, "_");
        text = text.replace(/</g, "_");
        text = text.replace(/>/g, "_");

        return text;
    }

    generateNextElementFacebookLink(elementFacebookLink, nextElementId) {
        let nextElementFacebookLink = "";

        // different link structure
        if (elementFacebookLink.includes("fbid=")) {
            // e.g. https://www.facebook.com/photo/?fbid=3693426703098&set=a.2831876204874
            nextElementFacebookLink = elementFacebookLink.replace(/fbid=[0-9]*/, 'fbid=' + nextElementId);
        }

        if (elementFacebookLink.includes("/photos/")) {
            // e.g. https://www.facebook.com/romaierioggi/photos/a.155832064615352/703683663163520/
            nextElementFacebookLink = elementFacebookLink.replace(/[0-9]*\/$/, '') + nextElementId + "/";
        }

        if (this.debug) { console.log("nextElementFacebookLink: " + nextElementFacebookLink); }

        if (nextElementFacebookLink === elementFacebookLink) {
            console.log("ERROR next element link");
            this.process.die(1);
        }


        return nextElementFacebookLink;
    }

    async readNextElementFacebookLink(elementFacebookLink) {
        let nextElementUrl = null;

        try {
            // read next element id
            const code1 = await this.page.$x('//script[contains(., "nextMedia")]')
            const code2 = await this.page.evaluate(el => el.textContent, code1[0])
            //if (this.debug) { fs.writeFileSync("finding-nextimage" + this.generateDateString() + ".html", code2); }
            const code3 = code2.split("\n");
            const lastLine = code3[code3.length - 1];
            const nextElementId = lastLine.replace(/.*"nextMedia"/, "").replace(/","__isMedia.*/, "").replace(/.*":"/g, '')
            if (this.debug) { console.log("nextElementId: " + nextElementId); }

            // next element url
            if (nextElementId.startsWith('permalink')) {
                nextElementUrl = "";  // last image reached
            } else {
                nextElementUrl = this.generateNextElementFacebookLink(elementFacebookLink, nextElementId);
            }
        } catch (err) {
            console.log("ERROR: nextElementId");
        }

        return nextElementUrl;
    }

    async readDate() {
        let dateUploaded = "";
        const selector = "a.oajrlxb2.g5ia77u1.qu0x051f.esr5mh6w.e9989ue4.r7d6kgcz.rq0escxv.nhd2j8a9.nc684nl6.p7hjln8o.kvgmc6g5.cxmmr5t8.oygrvhab.hcukyx3x.jb3vyjys.rz4wbd8a.qt6c0cv9.a8nywdso.i1ao9s8h.esuyzwwr.f1sip0of.lzcic4wl.gmql0nx0.gpro0wi8.b1v8xokw";

        try {
            dateUploaded = await this.page.$eval(selector, (el) => el.innerText);
        } catch (err) {
            console.log("ERROR: date selector not found");
        }

        return dateUploaded;
    }

    async readLikes() {
        const likes = await this.page.evaluate(() => {
            selector = "span.pcp91wgn";
            let el = document.querySelector(selector);
            return el ? el.innerText : ""
        })

        return likes;
    }

    async readElementDescription() {
        let selector = "div.a8nywdso.j7796vcc.rz4wbd8a.l29c1vbm";
        let articleBody = "";

        try {
            articleBody = await this.page.$eval(selector, (el) => el.innerText)
            articleBody = this.replaceUnwantedCharacters(articleBody);
            if (this.debug) { console.log("articleBody: " + articleBody); }
        } catch (err) {
            console.log("ERROR: pic description selector not found");
        }

        return articleBody;
    }

    convertDate(thedate) {
        // some external library like luxon could replace this code here
        const day = this.getNumberWithLeadingZero(thedate.replace(/\..*/, ""));
        const monthName = thedate.replace(/.* (.*?) .*/, "$1");
        const year = thedate.replace(/.* /, "");
        let month = monthName;  // fallback

        for (var i = 1; i <= 12; i++) {
            let objDate = new Date();
            objDate.setDate(1);
            objDate.setMonth(i-1);
            const monthLocale = objDate.toLocaleString("default", { month: "long" });

            if (monthLocale === monthName) {
                month = this.getNumberWithLeadingZero(i);
            }
        }

        const newDate = year + "-" + month + "-" + day;
        //console.log(newDate);

        return newDate;
    }

    async readAdditionalValuesTypeOld() {
        // read additional values
        const date = this.convertDate(await this.readDate());
        const likes = await this.readLikes();
        const elementDescription = await this.readElementDescription();

        const additionalValues = elementDescription
            + ";" + date
            + ";" + likes;

        return additionalValues;
    }

    async readAdditionalValuesTypeResponsive() {
        // parse json values
        let innerText = await this.page.evaluate(() =>  {
            return JSON.parse(document.querySelector("script").innerText);
        });

        const dateCreated = innerText.dateCreated;
        const articleBody = this.replaceUnwantedCharacters(innerText.articleBody);
        const comments = innerText.interactionStatistic[0].userInteractionCount;
        const likes = innerText.interactionStatistic[1].userInteractionCount;
        const shares = innerText.interactionStatistic[2].userInteractionCount;
        const follows = innerText.interactionStatistic[3].userInteractionCount;

        const additionalValues = articleBody
            + ";" + dateCreated
            + ";" + likes
            + ";" + comments
    	    + ";" + shares
            + ";" + follows;

        return additionalValues;
    }

    async readAdditionalValues() {
        const headHTML = await this.page.evaluate(() => document.head.innerHTML);
        const jsonString ='"dateCreated":"';
        let additionalValues = "";
        
        if (headHTML.includes(jsonString)) {
            // type responsive
            if (this.debug) { console.log("head contains jsonString!"); }
            additionalValues = await this.readAdditionalValuesTypeResponsive();
        } else {
            // type old
            additionalValues = await this.readAdditionalValuesTypeOld();
        }

        if (this.debug) { console.log("additionalValues: " + additionalValues); }

        return additionalValues;
    }

    async checkVideoUrl() {
        const videourl = await this.page.evaluate(() => {
            selector = "div.k4urcfbm.hwddc3l5.datstx6m";
            let el = document.querySelector(selector + " > video");
            return el ? el.src : ""
        })
        if (this.debug) { console.log("videourl: " + videourl); }

        return videourl;
    }

    async checkCanvas() {
        const canvas = await this.page.evaluate(() => {
            selector = "div.l9j0dhe7";
            let el = document.querySelector(selector + " > div > div > canvas");
            return el ? el.width : ""
        })

        return canvas;
    }

    async checkImage() {
        const imageUrl = await this.page.evaluate(() => {
            selector = "div.bp9cbjyn.j83agx80.cbu4d94t.taijpn5t.l9j0dhe7";
            let el = document.querySelector(selector + " > img");
            return el ? el.src : ""
        })
        if (this.debug) { console.log("imageUrl: " + imageUrl); }

        return imageUrl;
    }

    async readElement() {
        // wait for role="main" selector
        const selector = "div.rq0escxv.l9j0dhe7.du4w35lb.j83agx80.cbu4d94t.d2edcug0.hpfvmrgz.rj1gh0hx.buofh1pr.g5gj957u.bkyfam09.q4kn84j7";
        if (this.debug) { console.log("waitForSelector " + selector.substring(0, 60)); }

        try {
            // important selector
            await this.page.waitForSelector(selector);

             // check image
            const imageUrl = await this.checkImage();
            if (imageUrl !== "") {
                // image found
                return imageUrl;
            }

            // check video
            const videoUrl = await this.checkVideoUrl();
            if (videoUrl !== "") {
                // video found
                return "video;" + videoUrl;
            }

            // check canvas
            const canvas = await this.checkCanvas();
            if (canvas !== "") {
                // canvas found
                return "canvas;";
            }

            // other element
            return "other element;";

        } catch (err) {
            // important selector not found
            console.log("ERROR in readElement()");
        }

        return elementUrl;
    }

    async readElementAndGetValues(elementFacebookLink) {
        let elementUrl = "";
        let additionalValues = "";
        let nextElementFacebookLink = "";

        // open element
        while (elementUrl === "") {
            try {
                await this.page.goto(elementFacebookLink);
                await this.page.waitForTimeout(300);

                // read data
                elementUrl = await this.readElement();
                additionalValues = await this.readAdditionalValues();
                nextElementFacebookLink = await this.readNextElementFacebookLink(elementFacebookLink);

                if (nextElementFacebookLink === null) {
                    elementUrl = "";
                    additionalValues = "";
                    nextElementFacebookLink = "";
                }

            } catch (err) {
                console.log("ERROR open element");
                console.log(err);
                console.log("additionalValues: " + additionalValues);
                console.log("nextElementFacebookLink: " + nextElementFacebookLink);
            }

            if (elementUrl === "") {
                console.log("load image again");
            }
        }

	    const valuesArray = [elementUrl, additionalValues, nextElementFacebookLink];
	
	    return valuesArray;
    }


}
