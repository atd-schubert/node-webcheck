/**
 * An example how to use webcheck
 * @author Arne Schubert <atd.schubert@gmail.com>
 */

import * as url from "url";
import { IResult, Webcheck } from "webcheck";
import { CheerioPlugin } from "webcheck-cheerio";

const webcheck = new Webcheck({ // Instantiate webcheck
    concurrency: 1,
    headers: {
        "User-Agent": "Webcheck example crawler",
    },
});

const cheerio = new CheerioPlugin();
webcheck.addPlugin(cheerio);

cheerio.enable();

/*
 * Our own plugin
 *
 * It is much better to require a middleware as a module.
 */

const username = "atd-schubert";

webcheck.on("result", (result: IResult) => {
    const arr: string[] = [];
    if (result.url.indexOf("https://github.com/" + username) === 0) {
        if (!result.test) {
            if (result.response.statusCode !== 200) {
                // tslint:disable-next-line:no-console
                return console.error("User does not exists!");
            }
            if (typeof result.getCheerio === "function") {
                result.getCheerio((err: Error | null, $: any) => {
                    if (err) {
                        // tslint:disable-next-line:no-console
                        return console.error(err);
                    }
                    $(".repo-list-item").each((i: number, elem: any) => {
                        const proof = {};
                        webcheck.crawl({
                            proof,
                            test: "license",
                            title: $(elem).find("h3").text().trim(),
                            url: url.resolve(result.url, $(elem).find("h3 a").attr("href")) + "/blob/master/LICENSE",
                        });
                        webcheck.crawl({
                            proof,
                            test: "readme",
                            title: $(elem).find("h3").text().trim(),
                            url: url.resolve(result.url, $(elem).find("h3 a").attr("href")) + "/blob/master/README.md",
                        });
                    });
                });
            }
        } else {
            if (result.response.statusCode === 200) {
                result.proof[result.test] = true;
            } else {
                result.proof[result.test] = false;
            }
            if (result.proof.hasOwnProperty("license") && result.proof.hasOwnProperty("readme")) {
                arr.push("Repository " + result.title + " has");
                if (result.proof.license) {
                    arr.push("a license");
                } else {
                    arr.push("no license");
                }
                arr.push("and");
                if (result.proof.readme) {
                    arr.push("a readme");
                } else {
                    arr.push("no readme");
                }
                /* tslint:disable:no-console */
                console.log(arr.join(" ") + ".");
            }
        }
    }
});

webcheck.crawl({
    url: "https://github.com/" + username + "?tab=repositories",
});

// Have fun
