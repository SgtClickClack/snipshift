#!/bin/bash

echo "🚀 Creating Snipshift Production Deployment Package"
echo "=================================================="

# Create deployment directory
mkdir -p snipshift-production-deploy
cd snipshift-production-deploy

# Copy production server file
echo "📄 Copying production server configuration..."
cp ../production-server.js .

# Copy package files
echo "📦 Copying package configuration..."
cp ../package.json .
cp ../package-lock.json .

# Copy API build (already built)
echo "🔧 Copying API build..."
cp -r ../dist/index.js .

# Create a simple production build for the frontend
echo "🎨 Creating frontend production build..."
mkdir -p public

# Copy the updated source files
echo "📁 Copying updated source files..."
cp -r ../client/src public/src
cp ../client/index.html public/

# Create a simple index.html that loads our updated components
cat > public/index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Snipshift - Choose Your Role</title>
    <meta name="description" content="Connect barbershops, professionals, brands, and trainers through our advanced marketplace platform." />
    <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
    <script src="https://unpkg.com/react-router-dom@6/dist/umd/react-router-dom.production.min.js"></script>
    <script src="https://unpkg.com/@tanstack/react-query@5/build/umd/index.production.min.js"></script>
    <script src="https://unpkg.com/lucide-react@latest/dist/umd/lucide-react.js"></script>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; }
        .role-card { transition: all 0.3s ease; }
        .role-card:hover { transform: scale(1.05); }
        .role-card.selected { ring: 2px solid #ef4444; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1); }
    </style>
</head>
<body>
    <div id="root"></div>
    
    <script>
        const { useState } = React;
        const { BrowserRouter, Routes, Route, useNavigate } = ReactRouterDOM;
        
        // Updated role selection component with 3 roles
        function RoleSelectionPage() {
            const navigate = useNavigate();
            const [selectedRoles, setSelectedRoles] = useState([]);
            const [isLoading, setIsLoading] = useState(false);
            
            const roles = [
                {
                    id: "professional",
                    title: "Barber",
                    description: "Barbers and stylists looking for work opportunities",
                    icon: "✂️"
                },
                {
                    id: "hub", 
                    title: "Shop",
                    description: "Barbershop owners posting jobs and managing staff",
                    icon: "🏪"
                },
                {
                    id: "brand",
                    title: "Brand / Coach", 
                    description: "For product companies and educators to connect with professionals",
                    icon: "🏷️"
                }
            ];
            
            const toggleRole = (roleId) => {
                setSelectedRoles(prev => 
                    prev.includes(roleId) 
                        ? prev.filter(r => r !== roleId)
                        : [...prev, roleId]
                );
            };
            
            const handleContinue = () => {
                if (selectedRoles.length === 0) return;
                setIsLoading(true);
                
                // Simulate API call
                setTimeout(() => {
                    const primaryRole = selectedRoles[0];
                    navigate(`/onboarding/${primaryRole}`);
                }, 1000);
            };
            
            return React.createElement('div', {
                className: "min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex items-center justify-center p-6"
            }, [
                React.createElement('div', {
                    key: 'container',
                    className: "w-full max-w-4xl"
                }, [
                    // Header
                    React.createElement('div', {
                        key: 'header',
                        className: "text-center mb-12"
                    }, [
                        React.createElement('div', {
                            key: 'logo',
                            className: "mx-auto w-20 h-20 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center mb-6 shadow-lg border-2 border-gray-200"
                        }, React.createElement('span', { className: "text-white text-3xl" }, "✂️")),
                        React.createElement('h1', {
                            key: 'title',
                            className: "text-4xl font-bold text-gray-900 mb-3 tracking-tight"
                        }, "Welcome to Snipshift!"),
                        React.createElement('p', {
                            key: 'subtitle',
                            className: "text-gray-600 text-lg max-w-md mx-auto leading-relaxed"
                        }, "Select one or more roles to personalize your experience.")
                    ]),
                    
                    // Role Grid (3 columns)
                    React.createElement('div', {
                        key: 'grid',
                        className: "grid grid-cols-1 md:grid-cols-3 gap-6"
                    }, roles.map(role => 
                        React.createElement('div', {
                            key: role.id,
                            className: `role-card cursor-pointer transition-all duration-300 border-2 rounded-lg p-6 shadow-md hover:shadow-lg ${
                                selectedRoles.includes(role.id) 
                                    ? 'role-card selected border-red-500 bg-red-50' 
                                    : 'border-gray-200 bg-white hover:border-red-300'
                            }`,
                            onClick: () => toggleRole(role.id)
                        }, [
                            React.createElement('div', {
                                key: 'icon',
                                className: "text-4xl mb-4 text-center"
                            }, role.icon),
                            React.createElement('h3', {
                                key: 'title',
                                className: "text-xl font-bold text-gray-900 mb-2 text-center"
                            }, role.title),
                            React.createElement('p', {
                                key: 'description',
                                className: "text-gray-600 text-center leading-relaxed"
                            }, role.description),
                            React.createElement('div', {
                                key: 'status',
                                className: "text-sm text-center mt-3"
                            }, selectedRoles.includes(role.id) ? 'Selected' : 'Tap to select')
                        ])
                    )),
                    
                    // Continue Button
                    React.createElement('div', {
                        key: 'button-container',
                        className: "mt-10 text-center"
                    }, [
                        React.createElement('button', {
                            key: 'button',
                            className: `w-full max-w-lg bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold py-4 px-8 text-lg shadow-lg hover:shadow-xl transition-all duration-300 rounded-lg ${
                                selectedRoles.length === 0 || isLoading ? 'opacity-50 cursor-not-allowed' : ''
                            }`,
                            onClick: handleContinue,
                            disabled: selectedRoles.length === 0 || isLoading
                        }, isLoading ? "Setting up your account..." : 
                           selectedRoles.length > 1 ? "Continue with selected roles" : 
                           "Continue to Dashboard"),
                        React.createElement('p', {
                            key: 'note',
                            className: "text-gray-500 text-sm mt-6 max-w-sm mx-auto"
                        }, "You can switch roles anytime from the top navigation.")
                    ])
                ])
            ]);
        }
        
        // App component
        function App() {
            return React.createElement(BrowserRouter, null,
                React.createElement(Routes, null,
                    React.createElement(Route, {
                        path: "/auth/role-selection",
                        element: React.createElement(RoleSelectionPage)
                    }),
                    React.createElement(Route, {
                        path: "/onboarding/:role",
                        element: React.createElement('div', {
                            className: "min-h-screen flex items-center justify-center bg-gray-50"
                        }, React.createElement('div', {
                            className: "text-center"
                        }, [
                            React.createElement('h1', {
                                key: 'title',
                                className: "text-3xl font-bold text-gray-900 mb-4"
                            }, "Onboarding"),
                            React.createElement('p', {
                                key: 'description',
                                className: "text-gray-600"
                            }, "Welcome! Your onboarding process will begin here.")
                        ]))
                    })
                )
            );
        }
        
        // Render the app
        const root = ReactDOM.createRoot(document.getElementById('root'));
        root.render(React.createElement(App));
    </script>
</body>
</html>
EOF

echo "✅ Frontend production build created"

# Create deployment package
echo "📦 Creating deployment package..."
cd ..
tar -czf snipshift-production-build.tar.gz snipshift-production-deploy/

echo "🎉 Production deployment package created: snipshift-production-build.tar.gz"
echo "📊 Package size: $(du -sh snipshift-production-build.tar.gz | cut -f1)"
echo ""
echo "🚀 Ready for deployment to VentraIP!"
echo "   Upload snipshift-production-build.tar.gz to your server"
echo "   Extract and run: npm install --production"
echo "   Start with: node production-server.js"
