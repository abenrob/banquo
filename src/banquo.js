#!/usr/bin/env node

var fs            = require('fs');
var _             = require('underscore')
var phantom       = require('node-phantom');

function banquo(opts, callback) {
  var settings = _.extend({
    mode: 'renderBase64',
    viewport_width: 1440,
    delay: 5000,
    selector: 'body'
  }, opts);

  // Append 'http://' if protocol not specified
  if (!settings.url.match(/^\w+:\/\//)) {
    settings.url = 'http://' + settings.url;
  }

  var css_text;
  if (settings.css_hide){
    css_text = settings.css_file += "\n\n " + settings.css_hide + " { display: none; }\n";
  }

  // phantomjs heavily relies on callback functions
  var page;
  var ph;

  console.log('Requesting', settings.url);

  phantom.create(createPage)

  function createPage(err, _ph) {
    ph = _ph;
    ph.createPage(openPage);
  }

  function openPage(err, _page) {
    page = _page;
    page.set('onError', function() { return; });
    page.set('viewportSize', {width: settings.viewport_width, height: 900});
    page.open(settings.url, prepForRender);
  }

  function prepForRender(status) {
    page.evaluate(runInPhantomBrowser, renderImage, settings.selector, css_text);
  }

  function runInPhantomBrowser(selector, css_text) {
    if (css_text) {
      var style = document.createElement('style');
      style.appendChild(document.createTextNode(css_text));
      document.head.appendChild(style);
    }

    var element = document.querySelector(selector);
    return element.getBoundingClientRect();
  }

  function renderImage(rect) {
    setTimeout(function(){
      page.set('clipRect', rect);
      if (settings.mode != 'save'){
        page.renderBase64('PNG', base64Rendered);
      }else{
        page.render(settings.out_file, cleanup);
        callback('Writing to file... ' + settings.out_file);
      }
    }, settings.delay)
  }

  function base64Rendered(err, image_data){
    if (err){
      console.log(err);
    }
    callback(image_data)
    cleanup();
  }

  function cleanup() {
    ph.exit();
  }
}

module.exports = {
  capture: banquo
}
