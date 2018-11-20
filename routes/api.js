'use strict';

const expect      = require('chai').expect;
const MongoClient = require('mongodb');
const fetch       = require("node-fetch");

const MONGODB_CONNECTION_STRING = process.env.DB;

module.exports = function (app) {
  app.route('/api/stock-prices')
    .get((req, res) => {
      const symbol = req.query.stock;
      const like = req.query.like;
      let ip = req.header("x-forwarded-for");
      let url;
      let symbol1;
      let symbol2;
      let multiple = false;
      let stockResponse;
    
      if (ip == undefined) ip = "123.123.123.123";
      else ip = ip.split(",")[0];
    
      if (Array.isArray(symbol) === true) {
        console.log("two stocks")
        url = `https://api.iextrading.com/1.0/stock/market/batch?symbols=${symbol[0]},${symbol[1]}&types=quote`;
        symbol1 = symbol[0];
        symbol2 = symbol[1];
        multiple = true;
        stockResponse = {
          stockData: [{}, {}]
        };
      } else {
        url = `https://api.iextrading.com/1.0/stock/${symbol}/quote`;
        stockResponse = {
          stockData: {}
        };
      }

      fetch(url)
        .then(response => response.json())
        .then(jsonData => {
          if (multiple === false) {
            stockResponse.stockData.stock = jsonData.symbol
            stockResponse.stockData.price = String(jsonData.close);
          } else {
            stockResponse.stockData[0].stock = jsonData[symbol1.toUpperCase()].quote.symbol;
            stockResponse.stockData[1].stock = jsonData[symbol2.toUpperCase()].quote.symbol;
            stockResponse.stockData[0].price = String(jsonData[symbol1.toUpperCase()].quote.close);
            stockResponse.stockData[1].price = String(jsonData[symbol2.toUpperCase()].quote.close);
          }
        
          MongoClient.connect(MONGODB_CONNECTION_STRING, (err, db) => {
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
                    collection.findOneAndUpdate({symbol: symbol}, {$inc: {likes: 1}, $push: {ip: ip}}, {returnOriginal: false}, (err, result) => {
                      console.log("updated with 1 like");
                      
                      stockResponse.stockData.likes = result.value.likes;
                      res.json(stockResponse);
                    })
                  }
                }
              })
            
              
            } else if (like === "false" && multiple === true) {
                console.log("not liked, multiple")
                
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
                        
                        console.log("result: ", result.ops[0].likes)
                        
                        stockResponse.stockData[1].rel_likes = result.ops[0].likes - stockResponse.stockData[0].rel_likes;
                        stockResponse.stockData[0].rel_likes = stockResponse.stockData[0].rel_likes - result.ops[0].likes;
                        
                        res.json(stockResponse);
                      })
                    } else {
                      console.log("found 2");

                      stockResponse.stockData[1].rel_likes = result[0].likes - stockResponse.stockData[0].rel_likes;
                      stockResponse.stockData[0].rel_likes = stockResponse.stockData[0].rel_likes - result[0].likes;
                      
                      res.json(stockResponse);
                    }
                  })
                })
              

              } else if (like === "true" && multiple === true) {
                console.log("liked, multiple");
                
                collection.find({symbol: symbol1}).toArray((err, result) => {
                  if (result.length === 0) {
                    console.log("not found 1");
                    
                    collection.insert({symbol: symbol1, likes: 1, ip: [ip]}, (err, result) => {
                      console.log("created 1 with 1 like");
                      
                      stockResponse.stockData[0].rel_likes = result.ops[0].likes;
                    })
                  } else {
                    console.log("found 1");
                    
                    if (result[0].ip.indexOf(ip) != -1) {
                      console.log("ip has already liked");

                      stockResponse.stockData[0].rel_likes = result[0].likes;
                    } else {
                      collection.findOneAndUpdate({symbol: symbol1}, {$inc: {likes: 1}, $push: {ip: ip}}, {returnOriginal: false}, (err, result) => {
                        console.log("updated 1 with 1 like");

                        stockResponse.stockData[0].rel_likes = result.value.likes;
                      })
                    }
                  }
                  
                  collection.find({symbol: symbol2}).toArray((err, result) => {
                    if (result.length === 0) {
                      console.log("not found 2");
                      
                      collection.insert({symbol: symbol2, likes: 1, ip: [ip]}, (err, result) => {
                        console.log("created 2 with 1 like");
                        
                        stockResponse.stockData[1].rel_likes = result.ops[0].likes - stockResponse.stockData[0].rel_likes;
                        stockResponse.stockData[0].rel_likes = stockResponse.stockData[0].rel_likes - result.ops[0].likes;
                        
                        res.json(stockResponse);
                      })
                    } else {
                      console.log("found 2");
                      
                      if (result[0].ip.indexOf(ip) != -1) {
                        console.log("ip has already liked");
                        
                        stockResponse.stockData[1].rel_likes = result[0].likes - stockResponse.stockData[0].rel_likes;
                        stockResponse.stockData[0].rel_likes = stockResponse.stockData[0].rel_likes - result[0].likes;
                        
                        res.json(stockResponse);

                      } else {
                        collection.findOneAndUpdate({symbol: symbol2}, {$inc: {likes: 1}, $push: {ip: ip}}, {returnOriginal: false}, (err, result) => {
                          console.log("updated 2 with 1 like");
                          
                          stockResponse.stockData[1].rel_likes = result.value.likes - stockResponse.stockData[0].rel_likes;
                          stockResponse.stockData[0].rel_likes = stockResponse.stockData[0].rel_likes - stockResponse.stockData[1].rel_likes;
                          
                          res.json(stockResponse);
                        })
                      }
                    }
                  })
                })
                
                
              } else {
                console.log("not liked, single");
                
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
            });
        })
        .catch(error => {
          console.log("Error: ", error);
          res.json("Stock not found");
        })
    });
};