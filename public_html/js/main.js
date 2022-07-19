$.support.cors = true;
// 시작시 현재 위치 기반으로 약국 호출
const chkMobile = isMobileYn();

$(document).ready(async function(){
    let res = await roadMap();
    
    searchPharmacy(res[0], res[1]);
});

// 지도 호출
async function roadMap(){
    let XY = await getLocation(); 
    //지도를 삽입할 HTML 요소 또는 HTML 요소의 id를 지정합니다.
    var mapDiv = document.getElementById('map'); // 'map'으로 선언해도 동일
    //옵션 없이 지도 객체를 생성하면 서울 시청을 중심으로 하는 17 레벨의 지도가 생성됩니다.
    var mapOptions = {
        //
        center: new naver.maps.LatLng(XY.lat, XY.lon),
        zoom: 17
    }
    var map = new naver.maps.Map(mapDiv, mapOptions);

    return [map, XY];
};

// 시군구 검색버튼 눌러서 이동 + 약국
function searchPharmacyToSection(){
    let sido = document.getElementById("sido_code");
    let gugun = document.getElementById("sigoon_code");

    sido = sido.options[sido.selectedIndex].text;
    gugun = gugun.options[gugun.selectedIndex].text
    
    if ((sido == "선택") || (gugun == "선택")){
        alert("행정구역을 선택해 주세요.");
    }
    else{
        searchAddressToCoordinate(sido, gugun);
    }

}

// 검색된 시군구로 이동 + 약국 찾기
async function searchAddressToCoordinate(sido, gugun) {
    var map = await roadMap();
    let address = sido + " " + gugun;
    console.log(address);
    naver.maps.Service.geocode({
        query: address
    }, function(status, response) {
        if (status === naver.maps.Service.Status.ERROR) {
        if (!address) {
            return alert('Geocode Error, Please check address');
        }
        return alert('Geocode Error, address:' + address);
        }

        if (response.v2.meta.totalCount === 0) {
        return alert('No result.');
        }

        item = response.v2.addresses[0],
        point = new naver.maps.Point(item.x, item.y);

        map[0].setCenter(point);
        ajaxPharmacy(map[0], sido, gugun);
    });
}

// 좌표로 시군구 구하기
async function searchPharmacy(map, xy){
    console.log(xy);
    // 좌표로 시군구 구하기
    await naver.maps.Service.reverseGeocode({
        location : new naver.maps.LatLng(xy.lat, xy.lon)
    }, 
    function(status, response){
        let result = response.result;
        let items = result.items;

        // 현재 위치 시군구
        let sido_arr = items[0].addrdetail.sido.split(" ");
        let gugun_arr = items[0].addrdetail.sigugun.split(" ");
        
        let sido = "";
        let gugun = "";
        
        if(sido_arr.length == 1){
            sido = sido_arr[0];
            gugun = gugun_arr[0];
        }
        else if(sido_arr.length > 1){
            sido = sido_arr[0];
            gugun = sido_arr[1];
        }

        // let sido = document.getElementById("sido_code");
        // let gugun = document.getElementById("sigoon_code");
        // sido = sido.options[sido.selectedIndex].text;
        // gugun = gugun.options[gugun.selectedIndex].text;
        // console.log("sido--"+sido+"//"+"gugun"+gugun);
        let dateCnt = 1;

        ajaxPharmacy(map, sido, gugun);
    });
}

// 약국데이터 통신 함수
async function ajaxPharmacy(map, sido, gugun){
    console.log(sido);
    console.log(gugun);
    $.ajax({
            url : "/pharmach_list",
            type : "GET",
            cache : false,
            dataType : "json",
            data : {"Q0" : sido, 
                    "Q1" : gugun, 
                    "QT" : "", 
                    "QN" : "", 
                    "ORD" : "", 
                    "pageNo" : "1", 
                    "numOfRows" : "1000"
            },
            success : function(data) { 
                console.log(data)
                // api통신해서 받은 약국주소 데이터
                data.items.item.forEach(function(itm, index){
                    let dutyName = itm.dutyName; // 약국명
                    let dutyAddr = itm.dutyAddr; // 주소
                    let dutyTel1 = itm.dutyTel1; // 전화번호
                    
                    // 영업 시간 
                    let dutyTime = ""; 
                    let h, m = "";
                    
                    // 함수하나로 영업시간 계산하게 수정함 
                    // 좀더 수정해야함 지금은 for문 타는데 재귀식으로? 더간단하게 처리해볼것
                    dutyTime = separateDutyTime(itm);

                    let pharmacy_location = new naver.maps.LatLng(itm.wgs84Lat, itm.wgs84Lon);
                    let HOME_PATH = window.HOME_PATH || '.';
                    // 마커 옵션
                    let marker = new naver.maps.Marker({
                        map: map,
                        position: pharmacy_location,
                        icon: {
                            content: '<img src="'+ HOME_PATH +'/ico/pharmacy.png"' + 'style= "position: absolute; width: 5vh; height: 5vh;">',
                            size: new naver.maps.Size(50, 52),
                            origin: new naver.maps.Point(0, 0),
                            anchor: new naver.maps.Point(25, 26)
                        }
                    });
                    let contentString = [];
                    // 모바일, pc 체크해서 길찾기 연동
                    if(chkMobile) {
                        contentString = [
                            '<div class="iw_inner">',
                            '   <h2>' + dutyName + '</h2>',
                            '   <p>주소: <a href="nmap://route/public?dlat='+itm.wgs84Lat+'&dlng='+itm.wgs84Lon+'&dname='+encodeURI(dutyName)+'">' + dutyAddr + '</a><br />',
                            '   TEL:    <a/ href="tel:' + dutyTel1 + '">' + dutyTel1 + '</a><br />',
                            '   영업시간<br />', 
                            '       ' + dutyTime + '',
                            '   </p>',
                            '</div>'
                        ].join('');
                    }else{
                        contentString = [
                            '<div class="iw_inner">',
                            '   <h2>' + dutyName + '</h2>',
                            '   <p>주소: ' + dutyAddr + '<br />',
                            '   TEL: ' + dutyTel1 + '<br />',
                            '   영업시간<br />', 
                            '       ' + dutyTime + '',
                            '   </p>',
                            '</div>'
                        ].join('');

                    }
                    // 팝업창 옵션
                    var infowindow = new naver.maps.InfoWindow({
                        content: contentString,
                        maxWidth: 900,
                        backgroundColor: "#eee",
                        borderColor: "#ff5252",
                        borderWidth: 5,
                        anchorSize: new naver.maps.Size(30, 30),
                        anchorSkew: true,
                        anchorColor: "#eee",
                        pixelOffset: new naver.maps.Point(20, -20)
                    });

                    naver.maps.Event.addListener(marker, "click", function(e) {
                        if (infowindow.getMap()) {
                            infowindow.close();
                        } else {
                            infowindow.open(map, marker);
                        }
                    });
                })
            },
            error : function(request, status, error) {
                console.log(error)
            }
        });
}

// 현재 위치값 
async function getLocation() {
    let  XY = new Object();
    if(navigator.geolocation){
        let promise = new Promise(function(resolve, reject){ 
            navigator.geolocation.getCurrentPosition(function(position){
                resolve(position);
            });
        });
        
        let position = await promise;
        // position.coords.latitude 위도
        // position.coords.longitude 경도
        XY.lat = position.coords.latitude;
        XY.lon = position.coords.longitude;
    }
    return XY;
}


// 영업 시간 한번만 돌게하는 함수 테스트
function separateDutyTime(itm){
    let tmpArr = ["","월","화","수","목","금","토","일","공휴일"];
    let strTime = "dutyTime";
    let res = "";
    // 이부분 꼭 포문??
    for(let i=1; i<9; i++){
        let startTime = itm[strTime+i+"s"];
        let closeTime = itm[strTime+i+"c"];
        if(startTime && closeTime){
            let startH = String(startTime).substring(0,2);
            let startM = String(startTime).substring(2,4);
            let closeH = String(closeTime).substring(0,2);
            let closeM = String(closeTime).substring(2,4);
            res += tmpArr[i] + " - " + startH + ":" + startM + " ~ " + closeH + ":" + closeM + "<br>";
        }
    }

    return res;
}

// 모바일, 웹 구분 함수
function isMobileYn(){
    var filter = "win16|win32|win64|mac|macintel";
    if (navigator.platform) {
        if (filter.indexOf(navigator.platform.toLowerCase()) < 0) {
            return true;
        } else {
            return false;
        }
    }
    return false;
}


//  시군구 데이터 불러오는 함수	
$(function(){
$.ajax({
    type: "get",
    url: "https://api.vworld.kr/req/data?key=CEB52025-E065-364C-9DBA-44880E3B02B8&domain=http://localhost:8080&service=data&version=2.0&request=getfeature&format=json&size=1000&page=1&geometry=false&attribute=true&crs=EPSG:3857&geomfilter=BOX(13663271.680031825,3894007.9689600193,14817776.555251127,4688953.0631258525)&data=LT_C_ADSIDO_INFO",
    async: false,
    dataType: 'jsonp',
    success: function(data) {
        let html = "<option>선택</option>";

        data.response.result.featureCollection.features.forEach(function(f){
            // console.log(f.properties)
            let ctprvn_cd = f.properties.ctprvn_cd;
            let ctp_kor_nm = f.properties.ctp_kor_nm;
            
            html +=`<option value="${ctprvn_cd}">${ctp_kor_nm}</option>`
            
        })
        
        $('#sido_code').html(html);
        
    },
    error: function(xhr, stat, err) {}
});

// 시군구 데이터 불러오기2
$(document).on("change","#sido_code",function(){
    let thisVal = $(this).val();		

    $.ajax({
        type: "get",
        url: "https://api.vworld.kr/req/data?key=CEB52025-E065-364C-9DBA-44880E3B02B8&domain=http://localhost:8080&service=data&version=2.0&request=getfeature&format=json&size=1000&page=1&geometry=false&attribute=true&crs=EPSG:3857&geomfilter=BOX(13663271.680031825,3894007.9689600193,14817776.555251127,4688953.0631258525)&data=LT_C_ADSIGG_INFO",
        data : {attrfilter : 'sig_cd:like:'+thisVal},
        async: false,
        dataType: 'jsonp',
        success: function(data) {
            let html = "<option>선택</option>";

            data.response.result.featureCollection.features.forEach(function(f){
                // console.log(f.properties)
                let sig_cd = f.properties.sig_cd;
                let sig_kor_nm = f.properties.sig_kor_nm;
                
                html +=`<option value="${sig_cd}">${sig_kor_nm}</option>`
                
            })
            $('#sigoon_code').html(html);
            
        },
        error: function(xhr, stat, err) {}
    });
});
})