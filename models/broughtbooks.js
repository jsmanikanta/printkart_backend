const mongoose=require("mongoose");
const broughbooksschema= new mongoose.Schema({
    buyerid: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true,
    },
    sellerid: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true,
    },
})