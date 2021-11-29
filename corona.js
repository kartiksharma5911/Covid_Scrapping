// node corona.js --root=Covid --url=https://prsindia.org/covid-19/cases

let minimist = require("minimist");
let fs = require("fs");
let jsdom = require("jsdom");
let axios = require("axios");
let excel = require("excel4node");
let pdf = require("pdf-lib");
let path = require("path");

let args = minimist(process.argv);
let responseProm = axios.get(args.url);
responseProm.then(function(response)
{
    let html = response.data;
    let dom = new jsdom.JSDOM(html);
    let document = dom.window.document;
    let row = document.querySelectorAll('div#w0.grid-view tbody > tr');
    let data = [];
    for(let i = 0; i < row.length; i++)
    {
        let details = {};
        let stateName = row[i].querySelectorAll('td');
        details.state = stateName[1].textContent;
        details.confirm = stateName[2].textContent;
        details.active = stateName[3].textContent;
        details.discharge = stateName[4].textContent;
        details.death = stateName[5].textContent;

        data.push(details);
    }
    let presentdate = document.querySelectorAll("div.left-navigation>h1");
    let date = presentdate[1].textContent

    let india = [];
    for(let i = 0; i < data.length; i++)
    {
        createStates(india, data[i]);
    }
    for(let i = 0; i < data.length; i++)
    {
        createDetails(india, data[i]);
    }
    createExcel(india);
    createFolder(india, date);

}).catch(function(err){console.log(err);})

function createFolder(india, date)
{
    if(fs.existsSync(args.root) == true)
    {
        fs.rmdirSync(args.root, {recursive : true})
    }
    fs.mkdirSync(args.root);
    for(let i = 0;i < india.length; i++)
    {
        let location = path.join(args.root, india[i].state + ".pdf");
        for(let j = 0; j < india[i].details.length; j++)
        {
            createPdf(india[i], india[i].details[j], location, date);
        }
    }
}

function createPdf(india, details, location, date)
{
    let originalBytes = fs.readFileSync("template.pdf");
    let pdfdoc = new pdf.PDFDocument.load(originalBytes);
    pdfdoc.then(function(pdfdoc)
    {
        
        let page = pdfdoc.getPage(0);
        page.drawText(india.state,
            {
                x : 190,
                y : 630,
                size : 20,
                
            })
        page.drawText(date,
            {
                x : 145,
                y : 580,
                size : 20,
                
            })
        page.drawText(details.confirm_cases,
            {
                x : 350,
                y : 500,
                size : 18
            
        })
        page.drawText(details.active_cases,
            {
                x : 350,
                y : 420,
                size : 18
                
        })
        page.drawText(details.recovered_cases,
            {
                x : 350,
                y : 340,
                size : 18
                
        })
        page.drawText(details.total_deaths,
            {
                x : 350,
                y : 250,
                size : 18
                
        })

        let newBytes = pdfdoc.save();
        newBytes.then
        (function(newByte)
        {
            fs.writeFileSync(location, newByte, "utf-8");

        }).catch(function(err){console.log(err)})
    }).catch(function(err){console.log(err)})


}

function createExcel(india)
{
    let wb = new excel.Workbook;
    for(let i = 0; i < india.length; i++)
    {
        let sheet = wb.addWorksheet(india[i].state);
        sheet.cell(1, 1).string("Confirm Cases");
        sheet.cell(1,2).string("Active Cases")
        sheet.cell(1,3).string("Recovered Cases")
        sheet.cell(1,4).string("Deaths")
        sheet.column(1).setWidth(15);
        sheet.column(2).setWidth(15);
        sheet.column(3).setWidth(20);
        sheet.column(4).setWidth(15);
        for(let j = 0; j < india[i].details.length; j++)
        {
            sheet.cell(j + 2, 1).string(india[i].details[j].confirm_cases);
            sheet.cell(j + 2, 2).string(india[i].details[j].active_cases);
            sheet.cell(j + 2, 3).string(india[i].details[j].recovered_cases);
            sheet.cell(j + 2, 4).string(india[i].details[j].total_deaths);
        }
    }
    wb.write('Covid Details.xlsx');
}

function createDetails(india, data)
{
    let idx = -1;
    for(let i = 0; i < india.length; i++)
    {
        if(data.state == india[i].state)
        {
            idx = i;
        }
    }
    india[idx].details.push({
        confirm_cases : data.confirm,
        active_cases : data.active,
        recovered_cases : data.discharge,
        total_deaths : data.death
    })
}

function createStates(india, data)
{
    let idx = -1;
    for(let i = 0; i < india.length; i++)
    {
        if(india[i] == data)
        {
            idx = i;
        }
    }
    if(idx == -1)
    {
        india.push({
            state : data.state,
            details : []
        })
    }
}