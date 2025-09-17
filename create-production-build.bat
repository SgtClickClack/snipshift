@echo off
echo 🚀 Creating Snipshift Production Deployment Package
echo ==================================================

REM Create deployment directory
if not exist "snipshift-production-deploy" mkdir snipshift-production-deploy
cd snipshift-production-deploy

REM Copy production server file
echo 📄 Copying production server configuration...
copy ..\production-server.js .

REM Copy package files
echo 📦 Copying package configuration...
copy ..\package.json .
copy ..\package-lock.json .

REM Copy API build (already built)
echo 🔧 Copying API build...
copy ..\dist\index.js .

REM Create a simple production build for the frontend
echo 🎨 Creating frontend production build...
if not exist "public" mkdir public

REM Copy the updated source files
echo 📁 Copying updated source files...
xcopy ..\client\src public\src\ /E /I
copy ..\client\index.html public\

REM Create a simple index.html that loads our updated components
echo Creating updated role selection page...
(
echo ^<!DOCTYPE html^>
echo ^<html lang="en"^>
echo ^<head^>
echo     ^<meta charset="UTF-8" /^>
echo     ^<meta name="viewport" content="width=device-width, initial-scale=1.0" /^>
echo     ^<title^>Snipshift - Choose Your Role^</title^>
echo     ^<meta name="description" content="Connect barbershops, professionals, brands, and trainers through our advanced marketplace platform." /^>
echo     ^<script src="https://unpkg.com/react@18/umd/react.production.min.js"^>^</script^>
echo     ^<script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"^>^</script^>
echo     ^<script src="https://unpkg.com/react-router-dom@6/dist/umd/react-router-dom.production.min.js"^>^</script^>
echo     ^<script src="https://cdn.tailwindcss.com"^>^</script^>
echo     ^<style^>
echo         body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; }
echo         .role-card { transition: all 0.3s ease; }
echo         .role-card:hover { transform: scale(1.05); }
echo         .role-card.selected { ring: 2px solid #ef4444; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1); }
echo     ^</style^>
echo ^</head^>
echo ^<body^>
echo     ^<div id="root"^>^</div^>
echo     
echo     ^<script^>
echo         const { useState } = React;
echo         const { BrowserRouter, Routes, Route, useNavigate } = ReactRouterDOM;
echo         
echo         // Updated role selection component with 3 roles
echo         function RoleSelectionPage() {
echo             const navigate = useNavigate();
echo             const [selectedRoles, setSelectedRoles] = useState([]);
echo             const [isLoading, setIsLoading] = useState(false);
echo             
echo             const roles = [
echo                 {
echo                     id: "professional",
echo                     title: "Barber",
echo                     description: "Barbers and stylists looking for work opportunities",
echo                     icon: "✂️"
echo                 },
echo                 {
echo                     id: "hub", 
echo                     title: "Shop",
echo                     description: "Barbershop owners posting jobs and managing staff",
echo                     icon: "🏪"
echo                 },
echo                 {
echo                     id: "brand",
echo                     title: "Brand / Coach", 
echo                     description: "For product companies and educators to connect with professionals",
echo                     icon: "🏷️"
echo                 }
echo             ];
echo             
echo             const toggleRole = (roleId) =^> {
echo                 setSelectedRoles(prev =^> 
echo                     prev.includes(roleId) 
echo                         ? prev.filter(r =^> r !== roleId)
echo                         : [...prev, roleId]
echo                 );
echo             };
echo             
echo             const handleContinue = () =^> {
echo                 if (selectedRoles.length === 0) return;
echo                 setIsLoading(true);
echo                 
echo                 // Simulate API call
echo                 setTimeout(() =^> {
echo                     const primaryRole = selectedRoles[0];
echo                     navigate(`/onboarding/${primaryRole}`);
echo                 }, 1000);
echo             };
echo             
echo             return React.createElement('div', {
echo                 className: "min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex items-center justify-center p-6"
echo             }, [
echo                 React.createElement('div', {
echo                     key: 'container',
echo                     className: "w-full max-w-4xl"
echo                 }, [
echo                     // Header
echo                     React.createElement('div', {
echo                         key: 'header',
echo                         className: "text-center mb-12"
echo                     }, [
echo                         React.createElement('div', {
echo                             key: 'logo',
echo                             className: "mx-auto w-20 h-20 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center mb-6 shadow-lg border-2 border-gray-200"
echo                         }, React.createElement('span', { className: "text-white text-3xl" }, "✂️")),
echo                         React.createElement('h1', {
echo                             key: 'title',
echo                             className: "text-4xl font-bold text-gray-900 mb-3 tracking-tight"
echo                         }, "Welcome to Snipshift!"),
echo                         React.createElement('p', {
echo                             key: 'subtitle',
echo                             className: "text-gray-600 text-lg max-w-md mx-auto leading-relaxed"
echo                         }, "Select one or more roles to personalize your experience.")
echo                     ]),
echo                     
echo                     // Role Grid (3 columns)
echo                     React.createElement('div', {
echo                         key: 'grid',
echo                         className: "grid grid-cols-1 md:grid-cols-3 gap-6"
echo                     }, roles.map(role =^> 
echo                         React.createElement('div', {
echo                             key: role.id,
echo                             className: `role-card cursor-pointer transition-all duration-300 border-2 rounded-lg p-6 shadow-md hover:shadow-lg ${
echo                                 selectedRoles.includes(role.id) 
echo                                     ? 'role-card selected border-red-500 bg-red-50' 
echo                                     : 'border-gray-200 bg-white hover:border-red-300'
echo                             }`,
echo                             onClick: () =^> toggleRole(role.id)
echo                         }, [
echo                             React.createElement('div', {
echo                                 key: 'icon',
echo                                 className: "text-4xl mb-4 text-center"
echo                             }, role.icon),
echo                             React.createElement('h3', {
echo                                 key: 'title',
echo                                 className: "text-xl font-bold text-gray-900 mb-2 text-center"
echo                             }, role.title),
echo                             React.createElement('p', {
echo                                 key: 'description',
echo                                 className: "text-gray-600 text-center leading-relaxed"
echo                             }, role.description),
echo                             React.createElement('div', {
echo                                 key: 'status',
echo                                 className: "text-sm text-center mt-3"
echo                             }, selectedRoles.includes(role.id) ? 'Selected' : 'Tap to select')
echo                         ])
echo                     )),
echo                     
echo                     // Continue Button
echo                     React.createElement('div', {
echo                         key: 'button-container',
echo                         className: "mt-10 text-center"
echo                     }, [
echo                         React.createElement('button', {
echo                             key: 'button',
echo                             className: `w-full max-w-lg bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold py-4 px-8 text-lg shadow-lg hover:shadow-xl transition-all duration-300 rounded-lg ${
echo                                 selectedRoles.length === 0 || isLoading ? 'opacity-50 cursor-not-allowed' : ''
echo                             }`,
echo                             onClick: handleContinue,
echo                             disabled: selectedRoles.length === 0 || isLoading
echo                         }, isLoading ? "Setting up your account..." : 
echo                            selectedRoles.length ^> 1 ? "Continue with selected roles" : 
echo                            "Continue to Dashboard"),
echo                         React.createElement('p', {
echo                             key: 'note',
echo                             className: "text-gray-500 text-sm mt-6 max-w-sm mx-auto"
echo                         }, "You can switch roles anytime from the top navigation.")
echo                     ])
echo                 ])
echo             ]);
echo         }
echo         
echo         // App component
echo         function App() {
echo             return React.createElement(BrowserRouter, null,
echo                 React.createElement(Routes, null,
echo                     React.createElement(Route, {
echo                         path: "/auth/role-selection",
echo                         element: React.createElement(RoleSelectionPage)
echo                     }),
echo                     React.createElement(Route, {
echo                         path: "/onboarding/:role",
echo                         element: React.createElement('div', {
echo                             className: "min-h-screen flex items-center justify-center bg-gray-50"
echo                         }, React.createElement('div', {
echo                             className: "text-center"
echo                         }, [
echo                             React.createElement('h1', {
echo                                 key: 'title',
echo                                 className: "text-3xl font-bold text-gray-900 mb-4"
echo                             }, "Onboarding"),
echo                             React.createElement('p', {
echo                                 key: 'description',
echo                                 className: "text-gray-600"
echo                             }, "Welcome! Your onboarding process will begin here.")
echo                         ]))
echo                     })
echo                 )
echo             );
echo         }
echo         
echo         // Render the app
echo         const root = ReactDOM.createRoot(document.getElementById('root'));
echo         root.render(React.createElement(App));
echo     ^</script^>
echo ^</body^>
echo ^</html^>
) > public\index.html

echo ✅ Frontend production build created

REM Create deployment package
echo 📦 Creating deployment package...
cd ..
powershell -Command "Compress-Archive -Path 'snipshift-production-deploy' -DestinationPath 'snipshift-production-build.zip' -Force"

echo 🎉 Production deployment package created: snipshift-production-build.zip
echo.
echo 🚀 Ready for deployment to VentraIP!
echo    Upload snipshift-production-build.zip to your server
echo    Extract and run: npm install --production
echo    Start with: node production-server.js
