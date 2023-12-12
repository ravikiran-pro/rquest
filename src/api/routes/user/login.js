const { generateHash, generateJwt } = require('../../auth');
const { users } = require('../../models');

const login = async (req, res) => {
    try {
        const userDetails = req.body;

        if(userDetails.mobile && userDetails.password){

            let hashedPassword = await generateHash(userDetails.password)
            ///default register as user
            const filter = {
                mobile: userDetails.mobile,
                password: hashedPassword
              };
            
            const user = await users.findOne({
                where: filter
            });
            if(user?.password === hashedPassword){
                let payload = {
                    username: user?.username,
                    user_id: user?.id
                }
                let token = await generateJwt(payload);
                res.status(201).json({
                    success: true,
                    token: token,
                    user_data: payload
                });
            }else{
                res.status(500).json({ success: false, error: error, message: 'Password Authentication Failed' });
            }
            
        }else{
            res.status(500).json({ success: false, error: 'Username and password required', message: 'Username and password required' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error, message: 'Password Authentication Failed' });
    }
}

module.exports = { login }