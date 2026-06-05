import './App.css'

function App() {
  return (
    <div className="min-h-screen bg-[#0a0e27] text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-center mb-8 text-blue-500">
            Livicat - YouTube Live Chat Editor
          </h1>
          
          <div className="bg-[#151932] rounded-lg shadow-xl p-8 border border-gray-600">
            <p className="text-lg mb-4">YouTube Live Chat editor for OBS</p>
            <p className="text-gray-400">Tailwind CSS v4 configured and ready! ✨</p>
            
            <div className="mt-6 p-4 bg-[#0a0e27] rounded border border-blue-500">
              <h3 className="text-xl font-semibold mb-2">OBS-Optimized Features:</h3>
              <ul className="list-disc list-inside space-y-2 text-sm">
                <li>High contrast colors for readability</li>
                <li>Dark backgrounds for stream overlays</li>
                <li>Responsive for different scene sizes</li>
                <li>Performance optimized for long streams</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
