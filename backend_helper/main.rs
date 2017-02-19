use std::ffi::CStr;

#[no_mangle]
pub fn replace_resource_urls(content: *const i8, ret_buf: *mut u8, ret_buf_size: u32) -> u32 {
    let img_prefix = "http://www.ntzx.cn";
    let img_suffixes = [
        ".jpg",
        ".jpeg",
        ".png",
        ".gif",
        ".JPG",
        ".JPEG",
        ".PNG",
        ".GIF"
    ];

    let s;
    unsafe {
        s = match CStr::from_ptr(content).to_str() {
            Ok(r) => r,
            Err(_) => ""
        }
    }

    //let s = s.as_bytes();

    let mut buf = String::new();
    let mut ret = String::new();

    let mut state = 0;

    for ch in s.chars() {
        match state {
            0 => {
                if ch == '[' {
                    state = 1;
                    buf.clear();
                } else {
                    ret.push(ch);
                }
            },
            1 => {
                if ch == ']' {
                    let mut is_image = false;
                    for j in 0..img_suffixes.len() {
                        if buf.ends_with(img_suffixes[j]) {
                            is_image = true;
                            break;
                        }
                    }
                    if is_image {
                        ret.push_str(format!("<img class=\"article-image\" src=\"{}{}\" />", img_prefix, buf).as_str());
                    } else {
                        ret.push_str(format!("[{}]", buf).as_str());
                    }
                    buf.clear();
                    state = 0;
                } else {
                    buf.push(ch);
                }
            },
            _ => {
                panic!("Illegal state. This shouldn't happen.");
            }
        }
    }

    let ret_bytes = ret.as_bytes();
    let mut copy_len = ret_bytes.len();
    if ((ret_buf_size - 1) as usize) < copy_len {
        copy_len = (ret_buf_size - 1) as usize;
    }
    
    unsafe {
        std::ptr::copy(ret_bytes.as_ptr(), ret_buf, copy_len);

        let zero_value: u8 = 0;
        std::ptr::copy(&zero_value as *const u8, ret_buf.offset(copy_len as isize), 1);
    }

    //println!("{}", ret);

    copy_len as u32
}
