function validate_ip(ipaddress) {
  if (/^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(ipaddress)) {  
    return true;  
  }

  return false;
}

function highlight_node(n) {
  console.log("found node "+n);
  var scope = angular.element(document.getElementById("angular-element")).scope();
  scope.$apply(function(){
    scope.ui_node = n;
  });

  console.log(ui_topo);
  var nodeLayer = ui_topo.getLayer('nodes');
  var nodeLayerHighlightElements = nodeLayer.highlightedElements();
  nodeLayerHighlightElements.add(ui_topo.getNode(n.id));
  window.setTimeout(function() {
      var nodeLayer = ui_topo.getLayer('nodes');
      var nodeLayerHighlightElements = nodeLayer.highlightedElements();
      nodeLayerHighlightElements.clear();
  }, 10000);

  show_window("node-detail");
}

function highlight_link(l) {
  console.log("found link "+l);
  var scope = angular.element(document.getElementById("angular-element")).scope();
  scope.$apply(function(){
    scope.ui_link = l;
  });
  show_window("link-detail");
}

function search_ip() {
  searchbox = document.getElementById("global_search");

  let ip = searchbox.value;
  if (!validate_ip(ip)) {
    alert("IP has wrong format: "+ip);
  }

  for (var n in topology["topologyData"]["nodes"]) {
    let node = topology["topologyData"]["nodes"][n];

    for (var ln in node["ls_nodes"]) {
      node_data = node["ls_nodes"][ln];
      if (node_data["ipv4_id"] == ip) {
        highlight_node(node);
        return;
      }
      for (var p in node_data["prefixes"]) {
        pfx = node_data["prefixes"][p];
        if (pfx["prefix-id"]["prefix"] == ip) {
          highlight_node(node);
          return;
        }
      }
      for (var l in node_data["links"]) {
        link = node_data["links"][l]["link-id"];
        if ("ipv4_local" in link) {
          if (link["ipv4_local"] == ip) {
            highlight_link(node_data["links"][l]);
            return;
          }
        }
        if ("ipv4_remote" in link) {
          if (link["ipv4_remote"] == ip) {
            highlight_link(node_data["links"][l]);
            return;
          }
        }
        if ("ipv6_local" in link) {
          if (link["ipv6_local"] == ip) {
            highlight_link(node_data["links"][l]);
            return;
          }
        }
        if ("ipv6_remote" in link) {
          if (link["ipv6_remote"] == ip) {
            highlight_link(node_data["links"][l]);
            return;
          }
        }
      }
    }
  }

  alert(ip+" not found in topology");

}