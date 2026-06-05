import ChatDisplay from './components/ChatDisplay'
import SettingsPanel from './components/SettingsPanel'
import { Card } from './components/shared'
import './App.css'

function App() {
  return (
    <div className="min-h-screen bg-[#0a0e27] text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl font-bold text-center mb-8 text-blue-500">
            Livicat - YouTube Live Chat Editor
          </h1>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Chat Display Section */}
            <div>
              <ChatDisplay />
              <Card title="Component Status" className="mt-6">
                <ul className="space-y-2 text-sm">
                  <li className="text-green-400">✓ ChatDisplay component created</li>
                  <li className="text-green-400">✓ SettingsPanel component created</li>
                  <li className="text-green-400">✓ Shared components (Button, Card)</li>
                  <li className="text-green-400">✓ Hooks folder structure</li>
                  <li className="text-green-400">✓ Services folder structure</li>
                  <li className="text-green-400">✓ Types folder structure</li>
                  <li className="text-green-400">✓ Utils folder structure</li>
                </ul>
              </Card>
            </div>

            {/* Settings Panel Section */}
            <div>
              <SettingsPanel />
              <Card title="Architecture Ready" className="mt-6">
                <p className="text-gray-400 mb-4">Component structure established:</p>
                <div className="space-y-2 text-sm">
                  <p><span className="text-blue-400">components/ChatDisplay</span> - Chat interface</p>
                  <p><span className="text-blue-400">components/SettingsPanel</span> - Configuration UI</p>
                  <p><span className="text-blue-400">components/shared</span> - Reusable components</p>
                  <p><span className="text-blue-400">hooks/</span> - Custom React hooks</p>
                  <p><span className="text-blue-400">services/</span> - API integrations</p>
                  <p><span className="text-blue-400">types/</span> - TypeScript definitions</p>
                  <p><span className="text-blue-400">utils/</span> - Helper functions</p>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
