// src/components/Footer.tsx
export default function Footer() {
 return (
   <footer className="fixed bottom-0 left-0 right-0 bg-white border-t py-4">
     <div className="max-w-4xl mx-auto px-6 flex justify-between items-center text-sm text-slate-600">
       <div>
         Built by Mateusz Kozłowski.
       </div>
       <div className="flex gap-4">
         <a href="mailto:mateusz.kozlowski@gmail.com" className="hover:text-slate-900">Email</a>
         <a href="https:mateuszkozlowski.xyz/" className="hover:text-slate-900">WWW</a>
       </div>
     </div>
   </footer>
 );
}