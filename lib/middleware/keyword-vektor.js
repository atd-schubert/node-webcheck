"use strict";

exports.mkVektor = function(text, opts) {
  if(!text) return {wc:0, vektor:{}, count:{}};
  
  text = text.toLowerCase();
  
  text = text.split(".").join(" ")
    .split(",").join(" ")
    .split(":").join(" ")
    .split(";").join(" ")
    .split("?").join(" ")
    .split("(").join(" ")
    .split(")").join(" ")
    .split("!").join(" ")
    .split("|").join(" ")
    .split('"').join(" "); // delete sentencemarks...
  
  var regex = /\S+/g;
  var arr = text.match(regex);
  var wc = arr.length;
  var i = 0;
  var hash;
  var vektor = {};
  var count = {};
  
  for(i=0; i<arr.length; i++) {
    if(!vektor[arr[i]]) vektor[arr[i]] = 0;
    vektor[arr[i]]++
  }
  for (hash in vektor) {
    if(!count[vektor[hash]]) count[vektor[hash]] = [];
    count[vektor[hash]].push(hash);
  }
  return {vektor: vektor, wc: wc, count:count};
  
};

exports.compare = function(a,b) {
  var hash = "";
  var ama = 0, amb = 0, bmb = 0;
  var tmp;
  var i = 0;
  
  for (hash in a) {
   if(!a[hash]) continue;
   tmp = b[hash] || 0;
   
   ama += a[hash]*a[hash];
   amb += a[hash]*tmp;
   bmb += tmp*tmp;
  }
  
  return amb / (ama+bmb-amb);
};