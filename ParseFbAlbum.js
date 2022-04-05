const puppeteer = require('puppeteer');
const fs = require('fs');
const ParseFbSingleElement =  require('./ParseFbSingleElement.js')

module.exports = class ParseFbAlbum {

    // attributes
    prefix;
    albums;
    debug;
    albumType;
    filename;
    logFileName;
    browser;
    page;

    // constructor
    constructor(prefix, albums, debug) {
        this.prefix = prefix;
        this.albums = albums;
        this.debug = debug;
    }


    // methods
    getNumberWithLeadingZero(number) {
        if (number < 10) {
            number = "0" + number;
        }
        return number;
    }

    generateDateString() {
        const today = new Date();
        const year = today.getFullYear();
        const month = this.getNumberWithLeadingZero(today.getMonth()+1);
        const day = this.getNumberWithLeadingZero(today.getDate());

        const hour = this.getNumberWithLeadingZero(today.getHours());
        const minute = this.getNumberWithLeadingZero(today.getMinutes());
        const second = this.getNumberWithLeadingZero(today.getSeconds());

        const dateString = year + "-" + month + "-" + day + " " + hour+minute+second;
        return dateString;
    }

    extractAlbumId(albumFacebookLink) {
        const albumId = albumFacebookLink.replace(/.*set=a\./g, '').replace(/&.*/g, '');
        return albumId;
    }

    checkIfSubdirectoryExists(subdirectory) {
        if (!fs.existsSync(subdirectory)) {
            console.log("ERROR subdirectory " + subdirectory + " doesn't exist!");
            process.exit(1);
        }
    }

    generateOutputFileName() {
        const subdirectory = "output";
        this.checkIfSubdirectoryExists(subdirectory);

        const dateString = this.generateDateString();
        if (this.prefix === "") {
            this.prefix = "fbalbum";
        }

        const filename = subdirectory + "/" + this.prefix + " " + dateString + ".csv";
        return filename;
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

    async setPageConfiguration() {
        await this.page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
        userAgent = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.108 Safari/537.36';
        await this.page.setUserAgent(userAgent);

        // disable images, css and fonts
        await this.page.setRequestInterception(true);
        this.page.on('request', (req) => {
            if(req.resourceType() == 'stylesheet' || req.resourceType() == 'font' || req.resourceType() == 'image'){
                req.abort();
            } else {
                req.continue();
            }
        });
    }

    async processAlbumOfElements(firstElementFacebookLink) {
        // config
        const parseFbSingleElement = new ParseFbSingleElement(this.page, this.albumType, this.debug);
        let elementFacebookLink = firstElementFacebookLink;
        let numberOfElements = 0;

        // loop through all elements
        while (elementFacebookLink !== "") {
            numberOfElements++;
            console.log("FOTO " + numberOfElements + ": " + elementFacebookLink);

	        const valuesArray = await parseFbSingleElement.readElementAndGetValues(elementFacebookLink);
            //console.log(valuesArray);

	        const elementUrl = valuesArray[0];
	        const additionalValues = valuesArray[1];
	        const nextElementFacebookLink = valuesArray[2];
	    
            // save data
            const dataToSave = elementFacebookLink + ";" + elementUrl + ";" + additionalValues + "\n"
            fs.appendFile(this.filename, dataToSave, function (err) { if (err) throw err; });

            elementFacebookLink = nextElementFacebookLink;
        }

        return numberOfElements;
    }

    async readFirstElement(selector) {
        let firstElementUrl = "";
        try {
            if (this.debug) { console.log("waitForSelector " + selector); }
            await this.page.waitForSelector(selector);
            firstElementUrl = await this.page.$eval(selector + " > a", (el) => el.href);
            if (this.debug) { console.log("first Image: " + firstElementUrl); }
        } catch (err) {
            console.log("ERROR readFirstElement()")
        }
        return firstElementUrl;
    }

    async readFirstElementFacebookLink() {
        // selectors
        const selectorTypeResponsive = "div.jadejhlu";
        const selectorTypeOld = "div.g6srhlxm.gq8dxoea.bi6gxh9e.oi9244e8.l9j0dhe7";
        let firstElementFacebookLink = "";

        if (this.albumType === "responsive") {
            firstElementFacebookLink = await this.readFirstElement(selectorTypeResponsive);
        }

        if (this.albumType === "old") {
            firstElementFacebookLink = await this.readFirstElement(selectorTypeOld);
        }

        return firstElementFacebookLink;
    }

    async checkAlbumType() {
        const classTypeResponsive = 'class="jadejhlu l9j0dhe7 k4urcfbm"';
        const classTypeOld = 'class="g6srhlxm gq8dxoea bi6gxh9e oi9244e8 l9j0dhe7"';
        const bodyHTML = await this.page.evaluate(() => document.body.innerHTML);

        if (bodyHTML.includes(classTypeResponsive)) {
            return "responsive";
        }

        if (bodyHTML.includes(classTypeOld)) {
            return "old";
        }

        console.log("ERROR no album type found!");
        return "";
    }

    async readAlbumTitle() {
        // read album title selector
        let albumTitle = "";
        let selector = "div.px9k8yfb.hk9dxy2p";

        if (this.debug) { console.log("waitForSelector " + selector); }
        try {
            await this.page.waitForSelector(selector);
            const firstLine = await this.page.evaluate(() => Array.from(document.getElementsByClassName('px9k8yfb hk9dxy2p'), e => e.innerText));
            const secondLine = await this.page.evaluate(() => Array.from(document.getElementsByClassName('d2edcug0 hpfvmrgz qv66sw1b c1et5uql b0tq1wua a8c37x1j fe6kdd0r mau55g9w c8b282yb keod5gw0 nxhoafnm aigsh9s9 d9wwppkn hrzyx87i jq4qci2q a3bd9o3v b1v8xokw oo9gr5id hzawbc8m'), e => e.innerText));
            albumTitle = firstLine[0] + " " + secondLine[0];
            if (this.debug) { console.log("albumTitle: " + albumTitle); }
        } catch (err) {
            // album description not found
            console.log("ERROR album title selector: " + selector);
        }

        return albumTitle;
    }

    async checkIfAlbumIsAvailable(albumFacebookLink) {
        // check if error message exists
        const errorMessage = await this.page.evaluate(() => {
            selector = ".w0hvl6rk.qjjbsfad";
            let el = document.querySelector(selector);
            return el ? el.innerText : ""
        })

        if (errorMessage) {
            // album not available
            const logMessage = albumFacebookLink + ";error;" + errorMessage + "\n";
            fs.appendFile(this.logFileName, logMessage, function (err) { if (err) throw err; });
            console.log("ERROR: " + errorMessage);

            return false;
        }

        return true;
    }

    async openAlbum(albumFacebookLink) {
        // open album url
        if (this.debug) { console.log("open " + albumFacebookLink); }
        try {
            await this.page.goto(albumFacebookLink);
        } catch (err) {
            console.log("ERROR open album");
        }
    }

    async openAlbumAndGetValues(albumFacebookLink) {
        let albumIsAvailable = false;
        let albumTitle = "";
        let firstElementFacebookLink = "";
        
        while (firstElementFacebookLink === "") {
            await this.openAlbum(albumFacebookLink);

            // check if album is available
            albumIsAvailable = await this.checkIfAlbumIsAvailable(albumFacebookLink);

            if (albumIsAvailable === true) {
                // read values
                albumTitle = await this.readAlbumTitle();                
                firstElementFacebookLink = await this.readFirstElementFacebookLink();
                this.albumType = await this.checkAlbumType();
            }

            // check for errors
            if (this.albumType === "" || firstElementFacebookLink === "") {
                firstElementFacebookLink = "";
                console.log("reload album!");
            }
        }

        console.log("albumType: " + this.albumType);
        const valuesArray = [albumIsAvailable, albumTitle, firstElementFacebookLink];

        return valuesArray;
    }

    async processAlbum(albumFacebookLink) {
        const valuesArray = await this.openAlbumAndGetValues(albumFacebookLink);
        const albumIsAvailable = valuesArray[0];
        const albumTitle = valuesArray[1];
        const firstElementFacebookLink = valuesArray[2];

        if (albumIsAvailable === true) {
            // write albumTitle to file
            const dataToSave = albumTitle + "\n";
            fs.appendFile(this.filename, dataToSave, function (err) { if (err) throw err; });

            // process album
            const numberOfProcessedElements = await this.processAlbumOfElements(firstElementFacebookLink);

            // logging
            const logMessage = albumFacebookLink + ";" + numberOfProcessedElements + " elements\n";
            fs.appendFile(this.logFileName, logMessage, function (err) { if (err) throw err; });
        }
	
        // end album
        console.log("----------")
    }

    async launchBrowser() {
        // connect
        this.browser = await puppeteer.launch();
        this.page = await this.browser.newPage();
        try {
            // try catch necessary?
            await this.setPageConfiguration();
        } catch (err) {
            console.log("ERROR with setPageConfiguration()");
        }
    }

    async doConfiguration() {
        // config
        this.logFileName = "logging " + this.prefix + ".txt";
        this.filename = this.generateOutputFileName();

	    const albumCount = this.albums.length + " albums";
        console.log("SAVE TO: " + this.filename + " (" + albumCount + ")");
        fs.writeFileSync(this.filename, "parse " + albumCount + "\n");
    }

    async start() {
        await this.launchBrowser();
        await this.doConfiguration();

        // loop through all albums
        for (var i = 0; i < this.albums.length; i++) {
            console.log("album nr: " + (i + 1) + " / " + this.albums.length);
            await this.processAlbum(this.albums[i]);
        }

        await this.browser.close()
    }

}
