--- a/front/src/components/ResearchReport.tsx
+++ b/front/src/components/ResearchReport.tsx
@@ -1,4 +1,4 @@
-import React from 'react';
+import React, { useState, useEffect } from 'react';
 
 interface ResearchReportProps {
   data: any;
@@ -7,6 +7,7 @@
 
 const ResearchReport: React.FC<ResearchReportProps> = ({ data, onClose }) => {
   if (!data) return <div>No data available.</div>;
+  const [sourcesExpanded, setSourcesExpanded] = useState(false);
 
   const { company, brief, key_points: keyPoints, sources } = data;
 
@@ -16,90 +17,123 @@
     color: '#475569',
   };
 
+  const toggleSources = () => {
+    setSourcesExpanded(!sourcesExpanded);
+  };
+
   return (
     <div style={{
       position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
       backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
       zIndex: 1000
     }}>
-      <div style={{ background: 'white', padding: '2rem', borderRadius: '0.5rem', width: '80%', maxWidth: '800px', position: 'relative' }}>
+      <div style={{
+        background: 'white', padding: '2rem', borderRadius: '0.5rem', width: '80%', maxWidth: '800px', position: 'relative',
+        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
+      }}>
         <button style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }} onClick={onClose}>×</button>
         <h2>Analyse Stratégique IA</h2>
 
         {/* Aperçu de l'entreprise */}
         <div style={{ marginBottom: '1.5rem' }}>
           <h3 style={headingStyle}>Aperçu</h3>
           <p style={textStyle}>{brief.overview}</p>
         </div>
 
         {/* Culture de l'entreprise */}
         <div style={{ marginBottom: '1.5rem' }}>
           <h3 style={headingStyle}>Culture</h3>
           <p style={textStyle}>{brief.culture}</p>
         </div>
 
         {/* Défis actuels */}
         <div style={{ marginBottom: '1.5rem' }}>
           <h3 style={headingStyle}>Défis Actuels</h3>
           <p style={textStyle}>{brief.challenges}</p>
         </div>
 
         {/* Conseils (Actions Recommandées) */}
         {brief.advice && brief.advice.length > 0 && (
           <div style={{ marginBottom: '1.5rem' }}>
             <h3 style={headingStyle}>Conseils (Actions Recommandées)</h3>
             <ul style={{ listStyleType: 'disc', paddingLeft: '1.5rem' }}>
               {brief.advice.map((advice: string, index: number) => (
                 <li key={index} style={textStyle}>{advice}</li>
               ))}
             </ul>
           </div>
         )}
 
         {/* Points Clés (Tags) */}
         {keyPoints.length > 0 && (
           <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem' }}>
             {keyPoints.map((pt: any, idx: number) => (
               <span key={idx} style={{ fontSize: '0.75rem', background: '#f1f5f9', padding: '0.25rem 0.75rem', borderRadius: '1rem', color: '#475569', border: '1px solid #e2e8f0' }}>
                 {typeof pt === 'string' ? pt : (
                   <>
                     <strong>{pt.label || pt.key}: </strong>
                     {pt.value}
                   </>
                 )}
               </span>
             ))}
           </div>
         )}
 
         {/* Sources */}
         {sources && sources.length > 0 && (
           <div>
             <h3 style={headingStyle}>
               <button
                 onClick={toggleSources}
                 style={{
                   background: 'none',
                   border: 'none',
                   cursor: 'pointer',
                   fontSize: 'inherit',
                   color: '#334155',
                   padding: 0,
                   display: 'flex',
                   alignItems: 'center',
                   gap: '0.5rem'
                 }}
               >
                 Sources Utilisées ({sources.length})
                 <span style={{ fontSize: '0.8rem', transition: 'transform 0.3s ease', transform: sourcesExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>&#x25B8;</span>
               </button>
             </h3>
             <ul style={{
               listStyleType: 'none',
               paddingLeft: 0,
               overflow: 'hidden',
               transition: 'max-height 0.5s ease',
               maxHeight: sourcesExpanded ? '500px' : '0', // Adjust as needed
             }}>
               {sources.map((source: string, index: number) => (
                 <li key={index} style={{ ...textStyle, marginBottom: '0.5rem' }}>
                   {source}
                 </li>
               ))}
             </ul>
           </div>
         )}
+        <style jsx>{`
+          ul {
+            padding-left: 20px;
+            list-style-type: disc;
+          }
+
+          li {
+            margin-bottom: 0.5em;
+          }
+
+          button {
+            background-color: #f0f0f0;
+            border: none;
+            padding: 0.5em 1em;
+            border-radius: 5px;
+            cursor: pointer;
+          }
+
+          button:hover {
+            background-color: #ddd;
+          }
+        `}</style>
       </div>
     </div>
   );
