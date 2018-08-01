/*
*
*
*       Complete the API routing below
*
*
*/

'use strict';

const expect      = require('chai').expect;
const MongoClient = require('mongodb');
const fetch       = require("node-fetch");

const CONNECTION_STRING = process.env.DB; //MongoClient.connect(CONNECTION_STRING, function(err, db) {});

module.exports = function (app) {

  app.route('/api/stock-prices')
    .get(function (req, res){
      // I can GET /api/stock-prices with form data containing a Nasdaq stock ticker and recieve back an object stockData.
      // In stockData, I can see the stock(string, the ticker), price(decimal in string format), and likes(int).
      // I can also pass along field like as true(boolean) to have my like added to the stock(s). Only 1 like per ip should be accepted.
      // If I pass along 2 stocks, the return object will be an array with both stock's info but instead of likes, it will display rel_likes(the difference between the likes on both) on both.
    
      // {"stockData": {"stock":"GOOG","price":"786.90","likes":1} }
      // {"stockData": [ {"stock":"MSFT","price":"62.30","rel_likes":-1}, {"stock":"GOOG","price":"786.90","rel_likes":1} ] }

      const symbol = req.query.stock;
      const like = req.query.like;
    
      let ip = req.header("x-forwarded-for");
    
      if (ip == undefined) ip = "123.123.123.123";
      else ip = ip.split(",")[0];
    
      let url;
      let symbol1;
      let symbol2;
      let multiple = false;
      let stockResponse;
    
      if (Array.isArray(symbol)  === true) {
        url = "https://api.iextrading.com/1.0/stock/market/batch?symbols=" + symbol[0] + "," + symbol[1] + "&types=quote";
        symbol1 = symbol[0];
        symbol2 = symbol[1];
        multiple = true;
        stockResponse = { stockData: [ {}, {} ] };
      } else {
        url = "https://api.iextrading.com/1.0/stock/" + symbol + "/quote";
        stockResponse = { stockData: {} };
      }

      fetch(url)
        .then(response => {
          return response.json();
        }).then(jsonData => {
          if (multiple === false) {
            stockResponse.stockData.stock = jsonData.symbol
            stockResponse.stockData.price = String(jsonData.close);
          } else {
            stockResponse.stockData[0].stock = jsonData[symbol1.toUpperCase()].quote.symbol;
            stockResponse.stockData[1].stock = jsonData[symbol2.toUpperCase()].quote.symbol;
            stockResponse.stockData[0].price = String(jsonData[symbol1.toUpperCase()].quote.close);
            stockResponse.stockData[1].price = String(jsonData[symbol2.toUpperCase()].quote.close);
          }
        
          MongoClient.connect(CONNECTION_STRING, (err, db) => {
            const collection = db.collection("stocks");
            
            if (like === "true" && multiple === false) {
              console.log("liked, single");
              
              collection.find({symbol: symbol}).toArray((err, result) => {
                if (result.length === 0) {
                  console.log("not found");
                  
                  collection.insert({symbol: symbol, likes: 1, ip: [ip]}, (err, result) => {
                    console.log("created with 1 like");
                    
                    stockResponse.stockData.likes = result.ops[0].likes;
                    res.json(stockResponse);
                  })
                } else {
                  console.log("found");

                  if (result[0].ip.indexOf(ip) != -1) {
                    console.log("ip has already liked");
                    
                    stockResponse.stockData.likes = result[0].likes;
                    res.json(stockResponse);
                  } else {
                    collection.findOneAndUpdate({symbol: symbol}, {$inc: {likes: 1}, $push: {ip: ip}}, {new: true}, (err, result) => {
                      console.log("updated with 1 like");

                      stockResponse.stockData.likes = result.value.likes;
                      res.json(stockResponse);
                    })
                  }
                }
              })
              
            } else {
              console.log("not liked");
              
              if (multiple === true) {
                console.log("multiple")
                
                collection.find({symbol: symbol1}).toArray((err, result) => {
                  if (result.length === 0) {
                    console.log("not found 1");
                    
                    collection.insert({symbol: symbol1, likes: 0, ip: []}, (err, result) => {
                      console.log("created 1 with 0 likes");
                      
                      stockResponse.stockData[0].rel_likes = result.ops[0].likes;
                    })
                  } else {
                    console.log("found 1");
                    
                    stockResponse.stockData[0].rel_likes = result[0].likes;
                  }
                  collection.find({symbol: symbol2}).toArray((err, result) => {
                    if (result.length === 0) {
                      console.log("not found 2");
                      
                      collection.insert({symbol: symbol2, likes: 0, ip: []}, (err, result) => {
                        console.log("created 2 with 0 likes");
                        
                        stockResponse.stockData[1].rel_likes = result.ops[0].likes;
                      })
                    } else {
                      console.log("found 2");

                      stockResponse.stockData[1].rel_likes = result[0].likes;
                      res.json(stockResponse);
                    }
                  })
                })
                
              } else {
                console.log("single");
                
                collection.find({symbol: symbol}).toArray((err, result) => {
                  if (result.length === 0) {
                    console.log("not found");
                    
                    collection.insert({symbol: symbol, likes: 0, ip: []}, (err, result) => {
                      console.log("created with 0 likes");

                      stockResponse.stockData.likes = result.ops[0].likes;
                      res.json(stockResponse);
                    })
                  } else {
                    console.log("found");

                    stockResponse.stockData.likes = result[0].likes;
                    res.json(stockResponse);
                  }
                })
              }
              
            }
            
          });
        }).catch(err => {
          console.log("Error: ", err);
        })
      
    });
    
};
