const puppeteer = require('puppeteer');
const _cliProgress = require('cli-progress');
require("./welcome");
var spinner = require("./step");
var utils = require("./utils");
var qrcode = require('qrcode-terminal');
var path = require("path");
var argv = require('yargs').argv;

//console.log(ps);

//console.log(process.cwd());

async function Main() {

    try {
        var page;
        await downloadAndStartThings();
        var isLogin = await checkLogin();
        if (!isLogin) {
            await getAndShowQR();
        }
    } catch (e) {
        console.error("Looks like you got an error.");
        page.screenshot({ path: path.join(process.cwd(), "error.png") })
        console.error("Don't worry errors are good. They help us improve. A screenshot has already been saved as error.png in current directory. Please mail it on vasani.arpit@gmail.com along with the steps to reproduce it.");
        throw e;
    }

    /**
     * If local chrome is not there then this function will download it first. then use it for automation. 
     */
    async function downloadAndStartThings() {
        let botjson = utils.externalInjection("bot.json");
        spinner.start("Downloading chrome\n");
        const browserFetcher = puppeteer.createBrowserFetcher({
            path: process.cwd()
        });
        const progressBar = new _cliProgress.Bar({}, _cliProgress.Presets.shades_grey);
        progressBar.start(100, 0);

        const revisionInfo = await browserFetcher.download("619290", (download, total) => {
            //console.log(download);
            var percentage = (download * 100) / total;
            progressBar.update(percentage);
        });
        progressBar.update(100);
        spinner.stop("Downloading chrome ... done!");
        //console.log(revisionInfo.executablePath);
        spinner.start("Launching Chrome");
        var pptrArgv = [];
        if (argv.proxyURI) {
            pptrArgv.push( '--proxy-server=' + argv.proxyURI );
        }
        const browser = await puppeteer.launch({
            executablePath: revisionInfo.executablePath,
            headless: true,
            userDataDir: path.join(process.cwd(), "ChromeSession"),
            devtools: false,
            args: pptrArgv
        });
        spinner.stop("Launching Chrome ... done!");
        if (argv.proxyURI) {
            spinner.info("Using a Proxy Server");
        }
        spinner.start("Opening Whatsapp");
        page = await browser.pages();
        if (page.length > 0) {
            page = page[0];
            if (argv.proxyURI) {
                await page.authenticate({ username: argv.username , password: argv.password });
            }
            page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3336.0 Safari/537.36")
            await page.goto('https://web.whatsapp.com', {
                waitUntil: 'networkidle0',
                timeout: 0
            });
            //console.log(contents);
            var filepath = path.join(__dirname, "WAPI.js");
            await page.addScriptTag({path: require.resolve(filepath)});
            filepath = path.join(__dirname, "inject.js");
            await page.addScriptTag({path: require.resolve(filepath)});
            botjson.then((data) => {
                page.evaluate("var intents = " + data);
                //console.log(data);
            }).catch((err) => {
                console.log("there was an error \n" + err);
            });
            spinner.stop("Opening Whatsapp ... done!");
        }
    }

    async function checkLogin() {
        spinner.start("Page is loading");
        //TODO: avoid using delay and make it in a way that it would react to the event. 
        utils.delay(3000);
        //console.log("loaded");
        var output = await page.evaluate("WAPI.isLoggedIn();");
        //console.log("\n" + output);
        if (output) {
            spinner.stop("Looks like you are already logged in");
            console.log(await page.evaluate("window.chrome;"));
            console.log(await page.evaluate("window.outerWidth;"));
            console.log(await page.evaluate("window.outerHeight;"));

        } else {
            spinner.info("You are not logged in. Please scan the QR below");
        }
        return output;
    }

    //TODO: add logic to refresh QR.
    async function getAndShowQR() {
        //TODO: avoid using delay and make it in a way that it would react to the event. 
        await utils.delay(10000);
        var imageData = await page.evaluate(`document.querySelector("img[alt='Scan me!']").parentElement.getAttribute("data-ref")`);
        //console.log(imageData);
        qrcode.generate(imageData, { small: true });
        spinner.start("Waiting for scan \nKeep in mind that it will expire after few seconds");
        var isLoggedIn = await page.evaluate("WAPI.isLoggedIn();");
        while (!isLoggedIn) {
            //console.log("page is loading");
            //TODO: avoid using delay and make it in a way that it would react to the event. 
            await utils.delay(300);
            isLoggedIn = await page.evaluate("WAPI.isLoggedIn();");
        }
        if (isLoggedIn) {
            spinner.stop("Looks like you are logged in now");
            console.log("Welcome, WBOT is up and running");
        }
    }

}

Main();