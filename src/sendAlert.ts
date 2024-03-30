import axios from "axios";

const sendTelegramAlert = async (msg: string) => {
    const options = {
        method: 'GET',
        url: "https://api.telegram.org/bot" +
            process.env.BOTID +
            "/sendMessage?chat_id=" +
            process.env.CHATID +
            "&text=" +
            msg
    };
    const { data } = await axios.request(options);
    if (data.ok != true) {
        console.log('Error sending telegram alerts!');
    }

};

export default sendTelegramAlert;