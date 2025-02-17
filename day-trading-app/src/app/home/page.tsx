import React from 'react';
import Layout from '@/components/layour/layout';

function HomePage() {
    return (
        <div>
            <Layout>
                <div className='flex'>
                    <h1>Home Page</h1>
                    <p>This is the home page.</p>
                </div>
            </Layout>
        </div>
        
    );
};

export default HomePage;