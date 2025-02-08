import React from 'react';
import NavBarButton from './navbarButton';
function NavBar() {
    const features = ["Home", "Trade Stock", "Management", "Transactions"];

    return (
        <div className='bg-navbar width-1/6 h-screen flex flex-col items-center justify-center space-y-20'>
            <div className='text-2xl font-bold text-black'>
                Day-Trading
            </div>
            <div className="flex flex-col space-y-20">
                {
                    features.map((feature, index) => {
                        return (
                            <NavBarButton key={index} feature={feature} isClicked={true}/>
                        )
                    })
                }
            </div>
            

        </div>
    )
}

export default NavBar;