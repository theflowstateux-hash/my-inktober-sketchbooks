// Minimal local stand-in for the canvas .dc.html runtime, for testing only.
(function () {
  var R = window.React, h = R.createElement;
  function get(scope, path) {
    path = path.trim();
    if (path === 'true') return true;
    if (path === 'false') return false;
    if (/^-?\d+(\.\d+)?$/.test(path)) return +path;
    return path.split('.').reduce(function (o, k) { return o == null ? undefined : o[k]; }, scope);
  }
  var WHOLE = /^\s*\{\{([^}]*)\}\}\s*$/;
  function interp(str, scope) {
    var m = str.match(WHOLE);
    if (m) return get(scope, m[1]);
    return str.replace(/\{\{([^}]*)\}\}/g, function (_, p) { var v = get(scope, p); return v == null ? '' : v; });
  }
  var EVT = { onclick: 'onClick', onkeydown: 'onKeyDown', onmousemove: 'onMouseMove', onmouseenter: 'onMouseEnter',
    onmouseleave: 'onMouseLeave', onpointermove: 'onPointerMove', onpointerleave: 'onPointerLeave', onpointerenter: 'onPointerEnter',
    onfocus: 'onFocus', onblur: 'onBlur' };
  function styleObj(s) {
    var o = {};
    String(s).split(';').forEach(function (d) {
      var i = d.indexOf(':'); if (i < 0) return;
      var k = d.slice(0, i).trim(), v = d.slice(i + 1).trim(); if (!k) return;
      if (k.indexOf('--') !== 0) k = k.replace(/-([a-z])/g, function (_, c) { return c.toUpperCase(); });
      o[k] = v;
    });
    return o;
  }
  function conv(node, scope, key) {
    if (node.nodeType === 3) return interp(node.nodeValue, scope);
    if (node.nodeType !== 1) return null;
    var tag = node.localName;
    if (tag === 'sc-for') {
      var list = interp(node.getAttribute('list'), scope) || [], as = node.getAttribute('as');
      return h(R.Fragment, { key: key }, list.map(function (it, i) {
        var s = Object.assign({}, scope); s[as] = it; s.$index = i;
        return h(R.Fragment, { key: i }, kids(node, s));
      }));
    }
    if (tag === 'sc-if') return interp(node.getAttribute('value'), scope) ? h(R.Fragment, { key: key }, kids(node, scope)) : null;
    var props = { key: key };
    Array.prototype.forEach.call(node.attributes, function (a) {
      var n = a.name, v = interp(a.value, scope);
      if (n.indexOf('hint-') === 0) return;
      if (n === 'class') { props.className = v; return; }
      if (n === 'for') { props.htmlFor = v; return; }
      if (n === 'style') { props.style = styleObj(v); return; }
      if (EVT[n]) { props[EVT[n]] = v; return; }
      if (n === 'tabindex') { props.tabIndex = v; return; }
      if (n === 'ref') { props.ref = v; return; }
      if (n === 'disabled') { props.disabled = !!v && v !== 'false'; return; }
      if (n === 'crossorigin') { props.crossOrigin = v; return; }
      if (n.indexOf('-') > 0 && n.indexOf('data-') !== 0 && n.indexOf('aria-') !== 0) n = n.replace(/-([a-z])/g, function (_, c) { return c.toUpperCase(); });
      props[n] = v;
    });
    return h.apply(null, [tag, props].concat(kids(node, scope)));
  }
  function kids(node, scope) {
    return Array.prototype.map.call(node.childNodes, function (c, i) { return conv(c, scope, i); });
  }
  class DCLogic extends R.Component {
    render() { return h(R.Fragment, null, kids(this.__tpl, this.renderVals())); }
  }
  window.DCLogic = DCLogic;
  window.mountDC = function (src) {
    var doc = new DOMParser().parseFromString(src, 'text/html');
    var xdc = doc.querySelector('x-dc');
    var helmet = xdc.querySelector('helmet');
    document.head.insertAdjacentHTML('beforeend', helmet.innerHTML);
    helmet.remove();
    var code = doc.querySelector('script[data-dc-script]').textContent;
    var Comp = new Function('DCLogic', code + '\n;return Component;')(DCLogic);
    Comp.prototype.__tpl = xdc;
    var el = document.createElement('div'); document.body.appendChild(el);
    window.ReactDOMClient.createRoot(el).render(h(Comp, {}));
  };
})();
