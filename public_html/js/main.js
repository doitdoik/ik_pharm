
$.support.cors = true;
// 시작시 현재 위치 기반으로 약국 호출
$(document).ready(async function(){
    let res = await roadMap();
    
    searchPharmacy(res[0], res[1]);
});

// 지도 호출
async function roadMap(){
    let XY = await getLocation(); 
    //지도를 삽입할 HTML 요소 또는 HTML 요소의 id를 지정합니다.
    var mapDiv = document.getElementById('map'); // 'map'으로 선언해도 동일
    //옵션 없이 지도 객체를 생성하면 서울 시청을 중심으로 하는 16 레벨의 지도가 생성됩니다.
    var mapOptions = {
        //
        center: new naver.maps.LatLng(XY.lat, XY.lon),
        zoom: 15
    }
    var map = new naver.maps.Map(mapDiv, mapOptions);

    return [map, XY];
};

// 시군구 검색버튼 눌러서 이동 + 약국
function testFunc(){
    let sido = document.getElementById("sido_code");
    let gugun = document.getElementById("sigoon_code");

    sido = sido.options[sido.selectedIndex].text;
    gugun = gugun.options[gugun.selectedIndex].text
    
    searchAddressToCoordinate(sido, gugun);
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
        transmitPharmacy(map[0], sido, gugun);
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

        transmitPharmacy(map, sido, gugun);
    });
}

// 약국데이터 통신 함수
async function transmitPharmacy(map, sido, gugun){
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
                    
                    // 일단 for문 작성해보고 함수화해서 forEach안에서 함수 호출하는방식으로 변경하자
                    // 시작시간 종료시간, 요일처리??? 골아프다
                    for(let i=1; i<9; i++){
                        let openTmp = "dutyTime" + i + "s";
                        let optnTmpNext = "dutyTime" + (i+1) + "s";
                        let closeTmp = "dutyTime" + i + "c";
                        let closeTmpNext = "dutyTime" + (i+1) + "c";
                        if(itm[openTmp]){
                            if((itm[openTmp] == itm[optnTmpNext]) && (itm[closeTmp] == itm[closeTmpNext])){

                            };
                        }
                        else{

                        };
                    };

                    // 영업시간이 0900 1800 이런식으로 오기에 파싱이 필요할듯 이것도 함수화 해야하나?
                    let startH = String(itm.dutyTime1s).substring(0,2);
                    let startM = String(itm.dutyTime1s).substring(2,4);
                    let closeH = String(itm.dutyTime1c).substring(0,2);
                    let closeM = String(itm.dutyTime1c).substring(2,4);
                    if (itm.dutyTime1s && itm.dutyTime1c){
                        dutyTime += "월요일: " + startH + ":" + startM + " ~ " + closeH + ":" + closeM + "<br>";
                    }

                    let pharmacy_location = new naver.maps.LatLng(itm.wgs84Lat, itm.wgs84Lon);
    
                    let marker = new naver.maps.Marker({
                        map: map,
                        position: pharmacy_location
                    });

                    var contentString = [
                            '<div class="iw_inner">',
                            '   <h3>' + dutyName + '</h3>',
                            '   <p>' + dutyAddr + '<br />',
                            '       ' + dutyTel1 + '<br />',
                            '       ' + dutyTime + '',
                            '   </p>',
                            '</div>'
                        ].join('');

                    var infowindow = new naver.maps.InfoWindow({
                        content: contentString,
                        maxWidth: 440,
                        backgroundColor: "#eee",
                        borderColor: "#2db400",
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

// 영업 시간 합치는 함수
function calcDutyTime(){

};



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