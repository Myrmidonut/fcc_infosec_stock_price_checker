const url = "/api/stock-prices";

const singleStockForm = document.getElementById("singleStock");
const multiStockForm = document.getElementById("multiStock");
const singleInput = document.getElementById("singleInput");
const multiInputFirst = document.getElementById("multiInputFirst");
const multiInputSecond= document.getElementById("multiInputSecond");
const singleLike = document.getElementById("singleLike");
const multiLike = document.getElementById("multiLike");
const result = document.getElementById("jsonResult");
const singleResult = document.getElementById("singleResult");
const multiResult1 = document.getElementById("multiResult1");
const multiResult2 = document.getElementById("multiResult2");

singleStockForm.addEventListener("submit", e => {
  e.preventDefault();
  
  result.textContent = "";
  singleResult.textContent = "";
  
  fetch(url + `?stock=${singleInput.value}&like=${singleLike.checked}`)
  .then(response => response.json())
  .then(data => {
    result.textContent = JSON.stringify(data);
    singleResult.textContent = `${data.stockData.stock}: ${data.stockData.price}$, ${data.stockData.likes} likes`;
  })
})

multiStockForm.addEventListener("submit", e => {
  e.preventDefault();
  
  result.textContent = "";
  multiResult1.textContent = "";
  multiResult2.textContent = "";
  
  fetch(url + `?stock=${multiInputFirst.value}&stock=${multiInputSecond.value}&like=${multiLike.checked}`)
  .then(response => response.json())
  .then(data => {
    let relativeLikes1 = "";
    let relativeLikes2 = "";
    
    result.textContent = JSON.stringify(data);
    
    if (data.stockData[0].rel_likes > 0) relativeLikes1 = "+";
    else if (data.stockData[0].rel_likes == 0) relativeLikes1 = "+-";
    if (data.stockData[1].rel_likes > 0) relativeLikes2 = "+";
    else if (data.stockData[1].rel_likes == 0) relativeLikes2 = "+-";
      
    multiResult1.textContent = `${data.stockData[0].stock}: ${data.stockData[0].price}$, ${relativeLikes1}${data.stockData[0].rel_likes} likes`;
    multiResult2.textContent = `${data.stockData[1].stock}: ${data.stockData[1].price}$, ${relativeLikes2}${data.stockData[1].rel_likes} likes`;
  })
})