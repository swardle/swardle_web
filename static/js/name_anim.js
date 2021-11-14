
function RandomKatakanaString(org, percentage) {
    var letter_to_copy = Math.floor(org.length * percentage);
    var s = org.slice(0, letter_to_copy);
    for (i = letter_to_copy; i < org.length; i++) {
        if (org[i] != ' '){
            s += String.fromCharCode(0x30A0 + Math.random() * (0x30FF - 0x30A0 + 1));
        } else {
            s += ' ';
        }
    }
    return s;
}

function myAnim() {
    var animation_max_frame = 50;
    var animation_cur_frame = 0

    var name_obj = document.getElementsByClassName("scott_name")[0];
    var name_original_html = name_obj.innerHTML;
    name_obj.innerHTML = RandomKatakanaString(name_original_html, animation_cur_frame / animation_max_frame);

    var occu_obj = document.getElementsByClassName("occupation")[0];
    var occu_original_html = occu_obj.innerHTML;
    occu_obj.innerHTML = RandomKatakanaString(occu_original_html, animation_cur_frame / animation_max_frame);

    var id = setInterval(updateFrame, 30);

    function updateFrame() {
        if (animation_cur_frame == animation_max_frame) {
            clearInterval(id);
        } else {
            animation_cur_frame++;
            name_obj.innerHTML = RandomKatakanaString(name_original_html, animation_cur_frame / animation_max_frame);
            occu_obj.innerHTML = RandomKatakanaString(occu_original_html, animation_cur_frame / animation_max_frame);
        }
    }
}

myAnim();