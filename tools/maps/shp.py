import struct

def read_dbf(path):
    with open(path,'rb') as f: b=f.read()
    nrec=struct.unpack('<I',b[4:8])[0]
    hlen=struct.unpack('<H',b[8:10])[0]
    rlen=struct.unpack('<H',b[10:12])[0]
    fields=[]; off=32
    while b[off]!=0x0D:
        name=b[off:off+11].split(b'\0')[0].decode('latin-1')
        ftype=chr(b[off+11]); flen=b[off+16]
        fields.append((name,ftype,flen)); off+=32
    recs=[]
    for i in range(nrec):
        start=hlen+i*rlen; p=start+1; row={}
        for name,ftype,flen in fields:
            val=b[p:p+flen].decode('latin-1').replace('\x00','').strip(); p+=flen
            row[name]=val
        recs.append(row)
    return recs

def read_shp(path):
    """Generic reader: returns list of (shptype, parts) where parts = list of ring/part point lists."""
    import struct
    with open(path,'rb') as f: b=f.read()
    n=len(b); off=100; out=[]
    while off < n:
        rnum,clen=struct.unpack('>II',b[off:off+8]); off+=8
        end=off+clen*2
        st=struct.unpack('<i',b[off:off+4])[0]
        if st in (3,5,13,15,23,25):
            numparts,numpoints=struct.unpack('<II',b[off+36:off+44])
            pstart=off+44
            parts=list(struct.unpack('<%dI'%numparts,b[pstart:pstart+4*numparts]))
            xy=pstart+4*numparts
            pts=struct.unpack('<%dd'%(numpoints*2),b[xy:xy+16*numpoints])
            coords=[(pts[2*i],pts[2*i+1]) for i in range(numpoints)]
            segs=[]
            for i,s in enumerate(parts):
                e=parts[i+1] if i+1<len(parts) else numpoints
                segs.append(coords[s:e])
            out.append((st,segs))
        else:
            out.append((st,[]))
        off=end
    return out
