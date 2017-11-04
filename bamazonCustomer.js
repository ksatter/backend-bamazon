//Set up dependencies
const mysql = require("mysql");
const config = require("./serverConfig");
const Table = require("cli-table");
const inquirer = require("inquirer");
//Connect to server using info in config file
const connection = mysql.createConnection(config);

connection.connect(function (err) {
    if (err) throw err;
    //display inventory on connection
    displayInventory();
});

function displayInventory() {
    //Fetch data from server
    connection.query("SELECT * FROM products", function (err, res) {
        if (err) throw err;
        //Create table
        let table = new Table({
            head: ["ID", "Product Name", "Price"]
        });
        //Push data to table
        let i = 0;
        for (i in res) {
            table.push([res[i].item_id, res[i].product_name, '$' + res[i].price]);
        }
        //Display data to user
        console.log(`\nThanks for visiting Bamazon! \nHere's what we have to offer right now:\n`);
        console.log(table.toString());
        //ask if user would like to make a purchase
        salesCall();
    })
}

function salesCall() {
    inquirer.prompt([{
        type: 'confirm',
        name: "buy",
        message: "Would you like to purchase something today?"
    }]).then(function (answer) {
        if (answer.buy) orderInfo();
        else {
            console.log(`Sorry we didn't have anything for you today.\nPlease come back soon to see what's new!`);
            connection.end()
        }
    });
}

function orderInfo() {
    //get order info
    inquirer.prompt([{
        name: "id",
        type: "input",
        message: "Please enter the ID of the item you would like to purchase"
        },{
        name: "qty",
        type: "input",
        message: "How Many would you like to purchase?"
    }]).then(function (answer) {
        connection.query("SELECT * FROM products where ?", {item_id: answer.id}, function (err, res) {
            if (err) throw err;
            //Check Stock
            if (res[0].stock_quantity >= answer.qty) {
                console.log(`\nOrder placed!`);
                //Update database
                let newQuantity = res[0].stock_quantity - parseInt(answer.qty);
                let totalCost = parseInt(answer.qty) * res[0].price;
                let totalSales = res[0].product_sales + totalCost;
                connection.query("UPDATE products set ? where ?",
                    [
                        {
                            stock_quantity: newQuantity,
                            product_sales: totalSales
                        },
                        {
                            item_id: answer.id
                        }
                    ], function (err, res) {
                        if (err) throw err
                    });
                console.log(`Your total is: $${totalCost.toFixed(2)}\n`);
                displayInventory();
                salesCall();
            }
            else {
                console.log(`\nI'm so sorry, there are only ${res[0].stock_quantity} of those available\n`);
                displayInventory();
                salesCall();
            }
        });

    })

}

