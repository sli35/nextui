DEBUG = false;

const byteToHex = [];

for (let n = 0; n <= 0xff; ++n)
{
    const hexOctet = n.toString(16).padStart(2, "0");
    byteToHex.push(hexOctet);
}

const int32ToIp = (num) => {
  return (num >>> 24 & 0xFF) + '.' +
  (num >>> 16 & 0xFF) + '.' +
  (num >>> 8 & 0xFF) + '.' +
  (num & 0xFF);
};


function buf2hex(arrayBuffer) {
  const buff = new Uint8Array(arrayBuffer);
  const hexOctets = []; 

  for (let i = 0; i < buff.length; ++i)
      hexOctets.push(byteToHex[buff[i]]);

  return hexOctets.join("");
}

function display_buf(data, pos) {
  dataview = data.buffer.slice(pos);
  console.log(buf2hex(dataview));
}

function decode_link_identifier(data, offset) {
  if (DEBUG) { console.log("Decoding link identifier"); }

  HAS_LOCAL_REMOTE_ID = 0x00000001
  HAS_IPV4_LOCAL = 0x00000002
  HAS_IPV4_REMOTE = 0x00000004
  HAS_IPV6_LOCAL = 0x00000008
  HAS_IPV6_REMOTE = 0x00000010
  HAS_MT_ID = 0x00000020

  pos = offset;

  id = {};

  bitfield = data.getUint32(pos);
  pos += 4;

  if (bitfield & HAS_IPV4_LOCAL) {
    id["ipv4_local"] = int32ToIp(data.getUint32(pos));
    pos += 4;
  }

  if (bitfield & HAS_IPV4_REMOTE) {
    id["ipv4_remote"] = int32ToIp(data.getUint32(pos));
    pos += 4;
  }

  if (bitfield & HAS_IPV6_LOCAL) {
    id["ipv6_local"] = buf2hex(data.buffer.slice(pos, 16));
    pos += 16;
  }

  if (bitfield & HAS_IPV6_REMOTE) {
    id["ipv6_remote"] = buf2hex(data.buffer.slice(pos, 16));
    pos += 16;
  }
  
  if (bitfield & HAS_LOCAL_REMOTE_ID) {
    id["local_id"] = data.getUint32(pos);
    pos+=4;
    id["remote_id"] = data.getUint32(pos);
    pos+=4;
  }

  id["bitfield"] = bitfield;

  if (DEBUG) { console.log(id); }

  return [pos, id];
}

function decode_asla(data, offset) {
  HAS_APP_RSVPTE = 0x80000000
  HAS_APP_SRTE = 0x40000000
  HAS_APP_LFA = 0x20000000
  HAS_APP_FLEXALGO = 0x10000000

  HAS_EXT_ADMIN_GRP = 0x00000001
  HAS_TE_METRIC = 0x00000002
  HAS_SRLG = 0x00000004
  HAS_UNIDIR_DELAY = 0x00000008
  HAS_UNIDIR_MINMAX_DELAY = 0x00000010
  HAS_UNIDIR_DELAY_VAR = 0x00000020
  HAS_LINK_LOSS = 0x00000040
  HAS_UNIDIR_RESIDUAL_BW  = 0x00000080
  HAS_UNIDIR_AVAIL_BW   =   0x00000100
  HAS_UNIDIR_UTIL_BW  =     0x00000200

 pos = offset;

 asla = {};

 bitfield = data.getUint32(pos);
 pos += 4;

 var sabml = data.getUint8(pos);
 pos+=1;

 var udabml = data.getUint8(pos);
 pos+=1;

 if (DEBUG) { console.log("SABML: "+sabml+ " UDABML: "+udabml); }

 if (sabml > 0) {
  asla["sabm"] = []
  cur_sabm = 0;
  while (cur_sabm != sabml) {
    sabm = data.getUint32(pos);
    pos += 4;
    asla["sabm"][cur_sabm] = sabm;
    cur_sabm += 4;
  }
 }
 
 if (udabml > 0) {
  asla["udabm"] = []
  cur_udabm = 0;
  while (cur_udabm != udabml) {
    udabm = data.getUint32(pos);
    pos += 4;
    asla["udabm"][cur_udabm] = udabm;
    cur_udabm += 4;
    
  }
 }

 if (bitfield & HAS_TE_METRIC) {
  asla["te_metric"] = data.getUint32(pos);
  pos += 4;
}

if (bitfield & HAS_UNIDIR_DELAY) {
  asla["unidir_delay"] = data.getUint32(pos);
  pos += 4;
}

if (bitfield & HAS_UNIDIR_MINMAX_DELAY) {
  asla["unidir_min_delay"] = data.getUint32(pos);
  pos += 4;
  asla["unidir_max_delay"] = data.getUint32(pos);
  pos += 4;
}

if (bitfield & HAS_UNIDIR_DELAY_VAR) {
  asla["unidir_delay_var"] = data.getUint32(pos);
  pos += 4;
}

if (bitfield & HAS_LINK_LOSS) {
  asla["link_loss"] = data.getUint32(pos);
  pos += 4;
}

if (bitfield & HAS_EXT_ADMIN_GRP) {
  num_admin_grps = data.getUint32(pos);
  pos += 4;

  cur_ag = 0;
  asla["eags"] = [];

  while (cur_ag != num_admin_grps && pos < data.byteLength) {
    asla["eags"][cur_ag] = data.getUint32(pos);
    pos += 4;
    
    cur_ag += 1;
  }
  if (cur_ag != num_admin_grps) {
    console.log("wrong number of AG parsed: "+cur_ag+ "/" +num_admin_grps);
    return [-1, null];
  }
}

if (bitfield & HAS_SRLG) {
  num_srlgs = data.getUint16(pos);
  pos += 2;

  cur_srlg = 0;
  asla["srlgs"] = [];

  while (cur_srlg != num_srlgs && pos < data.byteLength) {
    asla["srlgs"][cur_srlg] = data.getUint32(pos);
    pos += 4;
    
    cur_srlg += 1;
  }
  if (cur_srlg != num_srlgs) {
    console.log("wrong number of SRLG parsed: "+cur_srlg+ "/" +num_srlgs);
    return [-1, null];
  }
}

 return [pos, asla];
}

function decode_link(data, offset) {
  HAS_EXT_ADMIN_GRP = 0x00000001
  HAS_MAX_LINK_BW = 0x00000002
  HAS_MAX_RESV_BW = 0x00000004
  HAS_UNRESV_BW = 0x00000008
  HAS_TE_METRIC = 0x00000010
  HAS_PROTECT_TYPE = 0x00000020
  HAS_MPLS_PROTO_MASK = 0x00000040
  HAS_METRIC = 0x00000080
  HAS_SRLG = 0x00000100
  HAS_OPAQUE = 0x00000200
  HAS_LOCAL_IPV4_ID = 0x00000400
  HAS_LOCAL_IPV6_ID = 0x00000800
  HAS_REMOTE_IPV4_ID = 0x00001000
  HAS_REMOTE_IPV6_ID = 0x00002000
  HAS_L2_BUNDLE_MBR = 0x00004000
  HAS_ADJ_SID = 0x00008000
  HAS_BGP_SID = 0x00010000
  HAS_OSPF_RMT_INTF_ID = 0x00020000
  HAS_OSPF_RMT_IPV4_ADDR = 0x00040000
  HAS_MSD = 0x00080000
  HAS_SRV6_ADJ_SID = 0x00100000
  HAS_UNIDIR_DELAY = 0x00200000
  HAS_UNIDIR_MINMAX_DELAY = 0x00400000
  HAS_UNIDIR_DELAY_VAR = 0x00800000
  HAS_UNIDIR_LINK_LOSS = 0x01000000
  HAS_UNIDIR_RESIDUAL_BW = 0x02000000
  HAS_UNIDIR_AVAIL_BW = 0x04000000
  HAS_UNIDIR_UTIL_BW = 0x08000000
  HAS_LOCAL_REMOTE_INTF_ID = 0x10000000
  HAS_ASLA = 0x20000000
  HAS_SRV6_ENDX_SID = 0x40000000

  if (DEBUG) { console.log("Decoding link"); }

  pos = offset;

  link = [];

  res = decode_node_identifier(data, pos);
  if (res[0] == -1) {
    return [-1, null]
  }
  pos = res[0];

  link["remote-node-id"] = res[1];

  res = decode_link_identifier(data, pos);
  if (res[0] == -1) {
    return [-1, null]
  }
  pos = res[0];

  link["link-id"] =  res[1];
  
  
  bitfield = data.getUint32(pos);
  pos += 4;

  if (bitfield & HAS_EXT_ADMIN_GRP) {
    num_admin_grps = data.getUint32(pos);
    pos += 4;

    cur_ag = 0;
    link["eags"] = [];

    while (cur_ag != num_admin_grps && pos < data.byteLength) {
      link["eags"][cur_ag] = data.getUint32(pos);
      pos += 4;
      
      cur_ag += 1;
    }
    if (cur_ag != num_admin_grps) {
      console.log("wrong number of AG parsed: "+cur_ag+ "/" +num_admin_grps);
      return [-1, null];
    }
  }

  if (bitfield & HAS_MAX_LINK_BW) {
    link["max_link_bw"] = data.getUint32(pos);
    pos += 4;
  }

  if (bitfield & HAS_MAX_RESV_BW) {
    link["max_resv_bw"] = data.getUint32(pos);
    pos += 4;
  }

  if (bitfield & HAS_TE_METRIC) {
    link["te_metric"] = data.getUint32(pos);
    pos += 4;
  }

  if (bitfield & HAS_METRIC) {
    link["igp_metric"] = data.getUint32(pos);
    pos += 4;
  }

  if (bitfield & HAS_UNIDIR_DELAY) {
    link["unidir_delay"] = data.getUint32(pos);
    pos += 4;
  }

  if (bitfield & HAS_UNIDIR_MINMAX_DELAY) {
    link["unidir_min_delay"] = data.getUint32(pos);
    pos += 4;
    link["unidir_max_delay"] = data.getUint32(pos);
    pos += 4;
  }

  if (bitfield & HAS_ADJ_SID) {
    num_sids = data.getUint16(pos);
    pos += 2;
    if (DEBUG) { console.log("Number of adj SIDs: "+num_sids); }

    cur_sid = 0;
    link["adj_sids"] = [];
    while (cur_sid != num_sids && pos < data.byteLength) {
      index = data.getUint32(pos);
      pos += 4;
  
      type = data.getUint8(pos);
      pos += 1;

      format = data.getUint8(pos);
      pos += 1;
  
      flags = data.getUint8(pos);
      pos += 1;

      weight = data.getUint8(pos);
      pos += 1;

      sid = {
        "value": index,
        "type": type,
        "format": format,
        "flags": flags,
        "weight": weight
      };

      link["adj_sids"][cur_sid] = sid;
      
      cur_sid += 1;
    }
    if (cur_sid != num_sids) {
      console.log("wrong number of Adj SIDs parsed: "+cur_sid+ "/" +num_sids);
      return [-1, null];
    }
  }

  if (bitfield & HAS_BGP_SID) {
    num_sids = data.getUint16(pos);
    pos += 2;
    if (DEBUG) { console.log("Number of BGP SIDs: "+num_sids); }

    cur_sid = 0;
    link["bgp_sids"] = [];
    while (cur_sid != num_sids && pos < data.byteLength) {

      type = data.getUint8(pos);
      pos += 1;

      format = data.getUint8(pos);
      pos += 1;
  
      flags = data.getUint8(pos);
      pos += 1;

      weight = data.getUint8(pos);
      pos += 1;

      index = data.getUint32(pos);
      pos += 4;
  

      sid = {
        "value": index,
        "type": type,
        "format": format,
        "flags": flags,
        "weight": weight
      };

      link["bgp_sids"][cur_sid] = sid;
      
      cur_sid += 1;
    }
    if (cur_sid != num_sids) {
      console.log("wrong number of BGP SIDs parsed: "+cur_sid+ "/" +num_sids);
      return [-1, null];
    }
  }

  if (bitfield & HAS_SRLG) {
    num_srlgs = data.getUint16(pos);
    pos += 2;

    cur_srlg = 0;
    link["srlgs"] = [];

    while (cur_srlg != num_srlgs && pos < data.byteLength) {
      link["srlgs"][cur_srlg] = data.getUint32(pos);
      pos += 4;
      
      cur_srlg += 1;
    }
    if (cur_srlg != num_srlgs) {
      console.log("wrong number of SRLG parsed: "+cur_srlg+ "/" +num_srlgs);
      return [-1, null];
    }
  }

  if (bitfield & HAS_MSD) {
    num_msd = data.getUint8(pos);
    if (DEBUG) { console.log("Num MSD: "+num_msd); }
    pos += 1;

    cur_msd = 0;
    link["msds"] = [];
    while (cur_msd != num_msd && pos < data.byteLength) {

      type = data.getUint8(pos);
      pos += 1
      value = data.getUint8(pos);
      pos += 1
      link["msds"][cur_msd] = {
        "type": type,
        "value": value
      }
      cur_msd += 1;
    }
    if (cur_msd != num_msd) {
      console.log("wrong number of MSD parsed: "+cur_msd+ "/" +num_msd);
      return [-1, null];
    }
  }

  if (bitfield & HAS_ASLA) {
    num_asla = data.getUint16(pos);
    if (DEBUG) { console.log("Num ASLA: "+num_asla); }
    pos += 2;

    cur_asla = 0;
    link["aslas"] = [];
    while (cur_asla != num_asla && pos < data.byteLength) {
      res = decode_asla(data, pos);
      if (res[0] == -1) {
        return [-1, null]
      }
      pos = res[0];
      
      link["aslas"][cur_asla] = res[1];

      cur_asla += 1;
    }
    if (cur_asla != num_asla) {
      console.log("wrong number of ASLA parsed: "+cur_asla+ "/" +num_asla);
      return [-1, null];
    }
  }

  return [pos, link]
}


function decode_prefix_identifier(data, offset) {
  if (DEBUG) { console.log("Decoding prefix identifier"); }

  let PFX_ID_HAS_OSPF_ROUTE_TYPE = 0x00000002;

  pos = offset;

  id = {};

  bitfield = data.getUint32(pos);
  pos += 4;

  af = data.getUint8(pos);
  pos += 1;

  if (bitfield & PFX_ID_HAS_OSPF_ROUTE_TYPE) {
    id["ospf_route_type"] = data.getUint8(pos);
    pos += 1;
  }

  if (af == 1) { // IPv4
    id["prefix"] = int32ToIp(data.getUint32(pos));
    pos += 4;
  }

  if (af == 2) { // IPv6
    id["prefix"] = buf2hex(data.buffer.slice(pos, 16));
    pos += 16;
  }

  id["bitfield"] = bitfield;
  id["af"] = af;
  id["prefix_len"] = data.getUint8(pos);
  pos += 1;

  return [pos, id];
}


function decode_prefix(data, offset) {
  let HAS_IGP_FLAGS = 0x00000001
  let HAS_ROUTE_TAG = 0x00000002
  let HAS_XROUTE_TAG = 0x00000004
  let HAS_METRIC = 0x00000008
  let HAS_IPv4_FWD_ADDR = 0x00000010
  let HAS_IPv6_FWD_ADDR = 0x00000020
  let HAS_OPAQUE = 0x00000040
  let HAS_SR_SID = 0x00000080
  let HAS_SRMS_RANGE = 0x00000100
  let HAS_XIGP_FLAGS = 0x00000200
  let HAS_IPv4_SRC_RID = 0x00000400
  let HAS_IPv6_SRC_RID = 0x00000800
  let HAS_OSPF_RT_TYPE1 = 0x00001000
  let HAS_SRV6_LOCATOR = 0x00002000
  let HAS_FAPM = 0x00004000

  if (DEBUG) { console.log("Decoding prefix"); }

  pos = offset;

  res = decode_prefix_identifier(data, pos);
  if (res[0] == -1) {
    return [-1, null]
  }
  pos = res[0];

  prefix = {
    "prefix-id": res[1]
  };
  
  bitfield = data.getUint32(pos);
  pos += 4;

  if (bitfield & HAS_IGP_FLAGS) {
    prefix["igp_flags"] = data.getUint8(pos);
    pos += 1;
  }

  if (bitfield & HAS_XIGP_FLAGS) {
    prefix["xigp_flags"] = data.getUint8(pos);
    pos += 1;
  }

  if (bitfield & HAS_METRIC) {
    prefix["metric"] = data.getUint32(pos);
    pos += 4;
  }

  if (bitfield & HAS_SR_SID) {
    num_pfx_sids = data.getUint8(pos);
    pos += 1;
    if (DEBUG) { console.log("Number of prefix SIDs: "+num_pfx_sids); }

    cur_pfx_sid = 0;
    prefix["prefix_sids"] = [];
    while (cur_pfx_sid != num_pfx_sids && pos < data.byteLength) {
      index = data.getUint32(pos);
      pos += 4;
  
      format = data.getUint8(pos);
      pos += 1;
  
      flags = data.getUint8(pos);
      pos += 1;

      algo = data.getUint8(pos);
      pos += 1;

      sid = {
        "value": index,
        "format": format,
        "flags": flags,
        "algo": algo
      };

      prefix["prefix_sids"][cur_pfx_sid] = sid;
      
      cur_pfx_sid += 1;
    }
    if (cur_pfx_sid != num_pfx_sids) {
      console.log("wrong number of Prefix SIDs parsed: "+cur_pfx_sid+ "/" +num_pfx_sids);
      return [-1, null];
    }
  }


  return [pos, prefix];
}

function decode_node_identifier(data, offset) {
  let pos = offset;
  if (DEBUG) { console.log("Decoding node ID"); }

  bitfield = data.getUint32(pos);
  pos += 4;

  ls_id = data.getUint32(pos);
  pos += 4;

  asn = data.getUint32(pos);
  pos += 4;
  
  proto_id = data.getUint8(pos);
  pos += 1;

  if (DEBUG) { console.log(" -> bitfield:"+bitfield+" ls_id:"+ls_id+" asn:"+asn+" proto_id:"+proto_id); }

  nodeID = {
    "asn": asn,
    "proto_id": proto_id
  };

  switch (proto_id) {
    case 1: //ISISL1
    case 2: //ISISL2
      nodeID["systemid"] = buf2hex(data.buffer.slice(pos, 7));
      pos += 7;
      break;
    case 3: //OSPF
    case 4: //OSPFv3
      nodeID["ospf_rid"] =  int32ToIp(data.getUint32(pos));
      pos += 4;
      nodeID["ospf_dr_id"] =  int32ToIp(data.getUint32(pos));
      pos += 4;
      nodeID["ospf_area_id"] =  data.getUint32(pos);
      pos += 4;
      break;
    case 7: // BGP
      nodeID["bgp_rid"] =  int32ToIp(data.getUint32(pos));
      pos += 4;
      nodeID["confed_asn"] =  data.getUint32(pos);
      pos += 4;
      break;
    default:
      alert("Unsupported protocol ID");
      return [-1, null];
  }

  return [pos, nodeID];
}

function decode_node(data, offset) {
var NODE_HAS_ISIS_AREA_ID = 0x00000001
var NODE_HAS_MT_ID = 0x00000002
var NODE_HAS_NODE_FLAGS = 0x00000004
var NODE_HAS_OPAQUE = 0x00000008
var NODE_HAS_IPV4_ID = 0x00000010
var NODE_HAS_IPV6_ID = 0x00000020
var NODE_HAS_NODE_NAME = 0x00000040
var NODE_HAS_SR_CAP = 0x00000080
var NODE_HAS_SR_ALGO = 0x00000100
var NODE_HAS_MSD = 0x00000200
var NODE_HAS_SRV6_CAP = 0x00000400
var NODE_HAS_SRV6_NODE_SID = 0x00000800
var NODE_HAS_SR_LOCAL_BLOCK = 0x00001000
var NODE_HAS_FAD = 0x00002000

  let pos = offset;
  if (DEBUG) { console.log("Start decoding node "+topology["numNodes"]); }

  res = decode_node_identifier(data, pos);
  if (res[0] == -1) {
    return [-1, null]
  }

  pos = res[0];

  node = {
    "nodeID": res[1]
  }

  // Domain ID
  node["domain_id"] = data.getUint32(pos);
  pos += 4;

  bitfield = data.getUint32(pos);
  pos += 4;

  node["flags"] = data.getUint8(pos);
  pos += 1;

  if (DEBUG) { console.log("Bitfield: "+bitfield+" Domain ID:"+node["domain_id"]+ " Flags: "+node["flags"]); }

  num_srgbs = data.getUint8(pos);
  if (DEBUG) { console.log("Num SRGBs: "+num_srgbs); }
  pos += 1;

  cur_srgb = 0;
  node["srgbs"] = [];

  while (cur_srgb != num_srgbs && pos < data.byteLength) {
    start = data.getUint32(pos);
    pos += 4;

    size = data.getUint32(pos);
    pos += 4;

    node["srgbs"][cur_srgb] = [start, size];
    
    cur_srgb += 1;
  }
  if (cur_srgb != num_srgbs) {
    console.log("wrong number of SRGBs parsed: "+cur_srgb+ "/" +num_srgbs);
    return [-1, null];
  }

  if (bitfield & NODE_HAS_IPV4_ID) {
    node["ipv4_id"] = int32ToIp(data.getUint32(pos));
    pos += 4;
  }

  if (bitfield & NODE_HAS_IPV6_ID) {
    node["ipv4_id"] = buf2hex(new Uint8Array(data, pos, 16));
    pos += 16;
  }

  if (bitfield & NODE_HAS_NODE_NAME) {
    len = data.getUint32(pos);
    pos += 4;

    buf = data.buffer.slice(pos, pos+len);
    node["name"] = String.fromCharCode.apply(null, new Uint8Array(buf));

    pos += len;
  }

  if (bitfield & NODE_HAS_SR_ALGO) {
    num_sr_algo = data.getUint8(pos);
    if (DEBUG) { console.log("Num SRAlgos: "+num_sr_algo); }
    pos += 1;

    cur_sr_algo = 0;
    node["sr_algos"] = [];
    while (cur_sr_algo != num_sr_algo && pos < data.byteLength) {
      node["sr_algos"][cur_sr_algo] = data.getUint8(pos);
      pos += 1;
      
      cur_sr_algo += 1;
    }
    if (cur_sr_algo != num_sr_algo) {
      console.log("wrong number of SRALGOs parsed: "+cur_sr_algo+ "/" +num_sr_algo);
      return [-1, null];
    }
  }

  if (bitfield & NODE_HAS_MSD) {
    num_msd = data.getUint8(pos);
    if (DEBUG) { console.log("Num MSD: "+num_msd); }
    pos += 1;

    cur_msd = 0;
    node["msds"] = [];
    while (cur_msd != num_msd && pos < data.byteLength) {

      type = data.getUint8(pos);
      pos += 1
      value = data.getUint8(pos);
      pos += 1
      node["msds"][cur_msd] = {
        "type": type,
        "value": value
      }
      cur_msd += 1;
    }
    if (cur_msd != num_msd) {
      console.log("wrong number of MSD parsed: "+cur_msd+ "/" +num_msd);
      return [-1, null];
    }
  }


  if (bitfield & NODE_HAS_SR_LOCAL_BLOCK) {
    num_srlbs = data.getUint8(pos);
    if (DEBUG) { console.log("Num SRLBs: "+num_srlbs); }
    pos += 1;

    cur_srlb = 0;
    node["srlbs"] = [];
    while (cur_srlb != num_srlbs && pos < data.byteLength) {


      start = data.getUint32(pos);
      pos += 4;

      size = data.getUint32(pos);
      pos += 4;

      node["srlbs"][cur_srlb] = [start, size];
      
      cur_srlb += 1;
    }
    if (cur_srlb != num_srlbs) {
      console.log("wrong number of SRLBs parsed: "+cur_srlb+ "/" +num_srlbs);
      return [-1, null];
    }
  }

  if (bitfield & NODE_HAS_FAD) {
    num_fads = data.getUint8(pos);
    if (DEBUG) { console.log("Num FADs: "+num_fads); }
    pos += 1;

    cur_fad = 0;
    node["fads"] = [];
    while (cur_fad != num_fads && pos < data.byteLength) {
      algo = data.getUint8(pos);
      pos += 1;
      metric_type = data.getUint8(pos);
      pos += 1;
      calc_type = data.getUint8(pos);
      pos += 1;
      priority = data.getUint8(pos);
      pos += 1;
      num_flags = data.getUint8(pos);
      fad = {
        "algo": algo,
        "metric_type": metric_type,
        "calc_type": calc_type,
        "priority": priority
      }

      pos += 1;
      if (num_flags > 0) {
        flags = data.getUint32(pos);
        pos += 4;
        fad["flags"] = flags;
      }

      num_eag_exc_any = data.getUint8(pos);
      pos += 1;
      if (num_eag_exc_any > 0) {
        eag = data.getUint32(pos);
        pos += 4;
        fad["eag_exc_any"] = eag;
      }
      num_eag_inc_any = data.getUint8(pos);
      pos += 1;
      if (num_eag_inc_any > 0) {
        eag = data.getUint32(pos);
        pos += 4;
        fad["eag_inc_any"] = eag;
      }
      num_eag_inc_all = data.getUint8(pos);
      pos += 1;
      if (num_eag_inc_all > 0) {
        eag = data.getUint32(pos);
        pos += 4;
        fad["eag_inc_all"] = eag;
      }

      node["fads"][cur_fad] = fad;

      cur_fad += 1;
    }
      
  }

  node["prefixes"] = [];
  node["links"] = [];

  num_prefixes = data.getUint32(pos);
  pos += 4;
  if (DEBUG) { console.log("Number of prefixes of node: "+num_prefixes); }
  cur_pfx = 0;

  while (cur_pfx < num_prefixes && pos < data.byteLength) {
    res = decode_prefix(data, pos);
    if (res[0] == -1) {
      return [-1, null];
    }
    pos = res[0];
    node["prefixes"][cur_pfx] = res[1];

    cur_pfx += 1;
  }
  if (cur_pfx != num_prefixes) {
    console.log("wrong number of prefixes parsed: "+cur_pfx+ "/" +num_prefixes);
    return [-1, null];
  }
  

  num_links = data.getUint32(pos);
  pos += 4;
  if (DEBUG) { console.log("Number of links of node: "+num_links); }
  cur_link = 0;

  while (cur_link < num_links && pos < data.byteLength) {
    res = decode_link(data, pos);
    if (res[0] == -1) {
      return [-1, null];
    }
    pos = res[0];
    node["links"][cur_link] = res[1];

    cur_link += 1;
  }
  if (cur_link != num_links) {
    console.log("wrong number of links parsed: "+cur_link+ "/" +num_links);
    return [-1, null];
  }

  topology["numNodes"] += 1;

  return [pos, node];
}

