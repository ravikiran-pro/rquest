import React from 'react';
import Routes from '../routes/routes';
import { Link } from 'react-router-dom';

const Navbar = () => {
    return (
        <div className='navBar' style={{ display:'flex', justifyContent:'flex-end', alignItems: 'center', height: 40, padding:"0px 40px" }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <div style={{ marginLeft: 20 }}>
                    <Link to={Routes.home}>Home</Link>
                </div>
                <div style={{ marginLeft: 20 }}>
                    <Link to={Routes.client}>Register</Link>
                </div>
            </div>
        </div>
    )

}

export default Navbar;