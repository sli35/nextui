var CLOUD_VERSION = 4;

function hide_all() {
  list = ["openFile", "computePath", "search", "link-detail", "node-detail"];
  
  let i = 0;

  while (i < list.length) {
    var x = document.getElementById(list[i]);
    if (x != null) {
      x.style.display = "none";
    }
    i++;
  }
};

function show_window(x) {
  hide_all();
  var x = document.getElementById(x);

  if (x != null) {
    x.style.display = "block";
  }
  
};

/****************
 * Topology loading and decoding
 * **************/



var topology = {
  domain_colors: ["#0000FF","#3399FF","#00CCCC","#006666","#009900","#CCCC00","#FF0000","#00FF80","#66FFFF","#A0A0A0","#000000","#FFCC99"],
  cur_color: 0,
  numNodes: 0,
  curNodeID: 0,
  topologyData: {
    "nodes": [],
    "links": [],
    "nodeSet": []
  }
}



function load_topology(x) {
  console.log(x.files);

  if (FileReader && x.files && x.files.length) {
    fr = new FileReader();
    fr.onload = function () {
      update_topology(fr.result);
    }
    fr.readAsArrayBuffer(x.files[0]);
    var scope = angular.element(document.getElementById("angular-element")).scope();
    console.log(scope);
    scope.$apply(function(){
      scope.ui_topo_name = x.files[0].name;
    });
  }

}



function reset_topo_data() {
  topology["numNodes"] = 0;
  topology["numLinks"] = 0;
  topology["numNodeSet"] = 0;
  topology["curNodeID"] = 0;
  topology["topologyData"]["nodes"] = [];
  topology["topologyData"]["links"] = [];
  topology["topologyData"]["nodeSet"] = [];
}

function compare_ls_node_identifier(n1, n2) {
  keys = ["asn", "ospf_area_id", "ospf_dr_id", "ospf_rid", "proto_id"];

  for (var k in keys) {
    if (keys[k] in n1 && keys[k] in n2) {
      if (n1[keys[k]] != n2[keys[k]]) {
        return false;
      }
    } else if (keys[k] in n1 && !(keys[k] in n2)) {
      return false;
    } else if (!(keys[k] in n1) && keys[k] in n2) {
      return false;
    }
  }

  return true;
}

function get_node_topo_id(nodeID) {
  for (var n in topology["topologyData"]["nodes"]) {
    for (var ln in topology["topologyData"]["nodes"][n]["ls_nodes"]) {
        if (compare_ls_node_identifier(topology["topologyData"]["nodes"][n]["ls_nodes"][ln]["nodeID"], nodeID)) {
          return topology["topologyData"]["nodes"][n]["id"];
        }
    }
  }

  return null;
}

function get_next_domain_color() {
  cur_color = topology["cur_color"];
  color = topology["domain_colors"][cur_color];
  topology["cur_color"] += 1;

  return color;
}

function get_next_node_topo_id() {
  cur = topology["curNodeID"];
  topology["curNodeID"]+=1;
  return cur;
}


function get_nodeset_by_label(lbl) {
  for (var n in topology["topologyData"]["nodeSet"]) {
    if (topology["topologyData"]["nodeSet"][n]["label"] == lbl) {
      return topology["topologyData"]["nodeSet"][n];
    }
  }
  return false
}

function new_nodeset(label) {
  set = {
    "label": label,
    "nodes": [],
    "icon": "groupL",
    "color": get_next_domain_color()
  };

  topology["topologyData"]["nodeSet"].push(set);
  topology["numNodeSet"] +=1;

  return set;
}

function can_merge_node(node) {
  for (var i in topology.topologyData.nodes) {
    cur_node = topology.topologyData.nodes[i];

    for (var j in cur_node["ls_nodes"]) {
      cur_ls_node = cur_node["ls_nodes"][j];
      if (node.name == cur_ls_node.name && cur_ls_node.name != undefined) {
        return cur_node;
      }
      if (node.ipv4_id == cur_ls_node.ipv4_id && cur_ls_node.ipv4_id != undefined) {
        return cur_node;
      }
    }
    
  }

  return false;
}

function new_node(ls_node) {
  var mnode = can_merge_node(ls_node);
  if (mnode) {
    mnode.ls_nodes.push(ls_node);
    return;
  }

  let label = ls_node["name"];
  if (label == undefined) {
    if (ls_node["ipv4_id"] != undefined) {
      label = ls_node["ipv4_id"];
    }
  }

  let node = {
    label: ls_node["name"],
    name: ls_node["name"],
    id: get_next_node_topo_id(),
    ls_nodes: [ ls_node ]
  }

  nodeSetID = "D"+ls_node["domain_id"] + "_P" + ls_node["nodeID"]["proto_id"];
  if ("ospf_area_id" in ls_node["nodeID"]) {
    nodeSetID += "_A"+ls_node["nodeID"]["ospf_area_id"];
  }

  var nodeSet = get_nodeset_by_label(nodeSetID);

  if (!nodeSet) {
    nodeSet = new_nodeset(nodeSetID);
  }

  nodeSet.nodes.push(node.id);

  node.color = nodeSet.color;

  topology["topologyData"]["nodes"].push(node);
  topology["numNodes"] +=1;

  return node;
}

function add_link(link) {
  topology["topologyData"]["links"].push(link);
  topology["numLinks"] +=1;

  return link;
}



function update_topology(bindata) {
  reset_topo_data();

  let dataView = new DataView(bindata);
  let pos = 0;

  cloud_ver = dataView.getInt32(pos);
  console.log("Cloud version: "+cloud_ver);

  if (cloud_ver != CLOUD_VERSION) {
    alert("File has unsupported CLOUD_VERSION: "+cloud_ver+ ", supported version is: "+CLOUD_VERSION);
    return;  
  }
  pos = pos + 4;
  
  num_nodes = dataView.getInt32(pos);
  console.log("Number of nodes: "+num_nodes);
  pos = pos + 4;

  let cur_node = 0;

  while (pos < dataView.byteLength && cur_node != num_nodes) {
    res = decode_node(dataView, pos);
    if (res[0] == -1) {
      console.log("decoding error, stopping");
      return;
    }
    pos = res[0];
    let node = res[1];

    new_node(node);

    cur_node+=1;
    
  }



  // Add Links
  for (var n in topology["topologyData"]["nodes"]) {
    for (var ln in topology["topologyData"]["nodes"][n]["ls_nodes"]) {
      let links = topology["topologyData"]["nodes"][n]["ls_nodes"][ln]["links"];

      for (var l in links) {
        let source = topology["topologyData"]["nodes"][n]["id"];
        let dest = get_node_topo_id(links[l]["remote-node-id"]);
        if (dest == null) {
          console.log("Remote node not found");
          console.log(links[l]["remote-node-id"]);
        }
        let new_link = {
          "source": source,
          "target": dest,
          "model": links[l]
        }
        add_link(new_link);

      }
    }
  }
  
  // Check if data was successfully parsed
  if (pos != dataView.byteLength) {
    alert("Parsed expected number of nodes, but trailing bytes exist... "+pos+"/"+dataView.byteLength);
    console.log("Trailing bytes:");
    display_buf(dataView, pos);
  } else if (num_nodes != cur_node) {
    alert("Parsed file, but decoded different number of nodes: "+cur_node+", expected "+num_nodes);
  }

  topology_ui_refresh(topology["topologyData"]);
}


