import React from 'react'

export default function StatsCard({label, value}){
  return (
    <div style={{padding:12,background:'#fff',borderRadius:8,boxShadow:'0 1px 6px rgba(0,0,0,0.04)'}}>
      <div style={{fontSize:12,color:'#666'}}>{label}</div>
      <div style={{fontSize:18,fontWeight:700,marginTop:8}}>{value}</div>
    </div>
  )
}