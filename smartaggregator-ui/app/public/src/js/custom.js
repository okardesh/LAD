$.urlParam = function (name) {
    var results = new RegExp('[\?&]' + name + '=([^&#]*)').exec(window.location.href);
    return results ? results[1] : null;
};
$(function () {
    "use strict";
    feather.replace()
    $(".preloader").fadeOut()
    $(".nav-toggler").on("click", function () {
        $("#main-wrapper").toggleClass("show-sidebar");
        $(".nav-toggler i").toggleClass("ti-menu");
    })
    $(function () {
        $(".service-panel-toggle").on("click", function () {
            $(".customizer").toggleClass("show-service-panel");
        })
        $(".page-wrapper").on("click", function () {
            $(".customizer").removeClass("show-service-panel");
        });
    })
    $(function () {
        $('[data-toggle="tooltip"]').tooltip({
            delay: {
                show: 500,
                hide: 0
            }
        });
    })
    $(function () {
        $('[data-toggle="popover"]').popover();
    })
    $(
        ".message-center, .customizer-body, .scrollable, .scroll-sidebar"
    ).perfectScrollbar({
        wheelPropagation: !0
    })
    $("body, .page-wrapper").trigger("resize")
    $(".page-wrapper").delay(20).show()
    $(".list-task li label").click(function () {
        $(this).toggleClass("task-done");
    })
    $(".show-left-part").on("click", function () {
        $(".left-part").toggleClass("show-panel");
        $(".show-left-part").toggleClass("ti-menu");
    })
    $(".custom-file-input").on("change", function () {
        var e = $(this).val();
        $(this).next(".custom-file-label").html(e);
    });
});
window.onload = function () {
    setTimeout(function () {
        $(".datepicker").toArray().forEach(function (inp) {
            var $this = $(inp),
                options1 = {
                    format: "dd/mm/yyyy",
                    multidate: $this.data("multiple"),
                    orientation: 'bottom left',
                    autoclose: !$this.data("multiple"),
                    language: locale,
                };
            if ($this.hasClass('datepicker-year')) {
                options1.format = "yyyy";
                options1.viewMode = "years";
                options1.minViewMode = "years";
            }
            $this.datepicker(options1);
        });
    }, 100);
    var options = {
        currency: {
            numeral: true,
            numeralThousandsGroupStyle: "thousand",
            numeralDecimalScale: 2,
        },
        rate: {
            numeral: true,
            numeralThousandsGroupStyle: "thousand",
            numeralDecimalScale: 4,
        },
        npv: {
            numeral: true,
            numeralThousandsGroupStyle: "thousand",
            numeralDecimalScale: 6,
        },
    };
    $.each(options, function (v) {
        $(".input-".concat(v))
            .toArray()
            .forEach(function (inp) {
                if (inp.id) new Cleave("#".concat(inp.id), options[v]);
            });
    });
};
$(document).ready(function () {
    windowLoadFinancialCompletedCounter();
    $(window).scroll(function () {
        if ($(this).scrollTop() > 100) {
            $('#backTop').fadeIn();
        } else {
            $('#backTop').fadeOut();
        }
    });
    $('#backTop').click(function () {
        $('html, body').animate({
            scrollTop: 0
        }, 1000);
        return false;
    });
    if ($.urlParam('luc')) $('.page-wrapper').addClass('allElementDisabled');
    makeSelect2();

    function scrollDown() {
        $('html, body').animate({
            scrollTop: $(document).height()
        }, 1000);
    }

    function makeSelect2() {
        $(".js-multiple-select").select2({
            placeholder: i18n["Please Choose"],
            theme: "bootstrap",
            width: "100%",
            allowClear: true
        });
    }

    /*    function makePriceFormat() {
            $('.price-element').priceFormat({
                prefix: '',
                thousandsSeparator: '',
                clearOnEmpty: true
            });
        }*/

    function makePriceFormat() {
        $('.price-element').on('change click keyup input paste', (function (event) {
            $(this).val(function (index, value) {
                return value.replace(/(?!\.)\D/g, "").replace(/(?<=\..*)\./g, "").replace(/(?<=\.\d\d\d).*/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ",");
            });
        }));
    }

    function getStatusColor(status) {
        switch (status) {
            case 0:
                return '#5f76e8';
            case 1:
            case 'Active':
                return '#22ca80';
            case 2:
            case 'Passive':
                return '#fdc16a';
            case 3:
            case 'Updated':
                return '#6c757d';
            case 9:
            case 'Deleted':
                return '#ff4f70';
            case 'N':
                return '#28a745';
            case 'W':
                return '#ffc107';
            case 'C':
                return '#343a40';
            case 'A':
                return '#007bff';
            case 'R':
                return '#dc3545';
            case 'I':
                return '#6c757d';
            default:
                return '';
        }
    }

    function getStatusText(status) {
        switch (status) {
            case 1:
                return '1-' + i18n['Active'];
            case 2:
                return '2-' + i18n['Passive'];
            case 3:
                return '3-' + i18n['Updated'];
            case 9:
                return '9-' + i18n['Deleted'];
            case 'N':
                return 'N-' + i18n['NewApproval'];
            case 'W':
                return 'W-' + i18n['Waiting Approval'];
            case 'C':
                return 'C-' + i18n['Canceled'];
            case 'A':
                return 'A-' + i18n['Approved'];
            case 'R':
                return 'R-' + i18n['Rejected'];
            case 'I':
                return 'I-' + i18n['Inspected'];
            default:
                return status;
        }
    }

    var mirrors = [];
    Array.prototype.slice.call($('.sql-editor')).forEach(function (editor) {
        makeSqlEditor(editor);
    });

    function makeSqlEditor(target) {
        target.classList.add('cmSQLEditor-' + mirrors.length);
        var mirror = CodeMirror.fromTextArea(target, {
            mode: 'text/x-plsql',
            indentWithTabs: true,
            smartIndent: true,
            lineNumbers: false,
            matchBrackets: true,
            autofocus: true,
            lineWrapping: true,
            readOnly: target.classList.contains('readonly'),
            theme: 'darcula',
            extraKeys: {
                "Ctrl-Space": "autocomplete"
            }
        });
        mirrors.push(mirror);
    }

    $("input[required]").change("invalid", function () {
        this.value == '' ? this.setCustomValidity(i18n['Please fill out this field']) : this.setCustomValidity("");
    });
    /*Sonar Bug Fixed var dtablang;*/
    var dtablang;
    if (locale == 'en') {
        dtablang = {
            sEmptyTable: "No data available in table",
            sInfo: "Showing _START_ to _END_ of _TOTAL_ entries",
            sInfoEmpty: "Showing 0 to 0 of 0 entries",
            sInfoFiltered: "(filtered from _MAX_ total entries)",
            sInfoPostFix: "",
            sInfoThousands: ",",
            sLengthMenu: "Show _MENU_ entries",
            sLoadingRecords: "Loading...",
            sProcessing: "Processing...",
            sSearch: "Filter:",
            sZeroRecords: "No matching records found",
            oPaginate: {
                sFirst: "First",
                sLast: "Last",
                sNext: "Next",
                sPrevious: "Previous",
            },
            oAria: {
                sSortAscending: ": activate to sort column ascending",
                sSortDescending: ": activate to sort column descending",
            },
        };
    } else {
        dtablang = {
            sProcessing: "İşleniyor...",
            sLengthMenu: "Sayfada _MENU_ Kayıt Göster",
            sZeroRecords: "Eşleşen Kayıt Bulunmadı",
            sInfo: "  _TOTAL_ Kayıttan _START_ - _END_ Arası Kayıtlar",
            sInfoEmpty: "Kayıt Yok",
            sInfoFiltered: "( _MAX_ Kayıt İçerisinden Bulunan)",
            sInfoPostFix: "",
            sSearch: "Filtrele:",
            sUrl: "",
            oPaginate: {
                sFirst: "İlk",
                sPrevious: "Önceki",
                sNext: "Sonraki",
                sLast: "Son",
            },
        };
    }
    $.fn.dataTable.moment("DD/MM/YYYY");
    var table = $(".multi-col-order").DataTable({
        language: dtablang,
        buttons: [
            $.extend(
                true, {}, {
                    exportOptions: {
                        format: {
                            body: function (data, column1, row, node) {
                                if ($(node).children("select").get(0)) {
                                    return $(node).find("option:selected").text();
                                } else if ($(node).children().get(0)) {
                                    return $(node).children().text() || $(node).children().val();
                                } else return node.innerText;
                            },
                            header: function (text, index, node) {
                                // Change column header if it includes something
                                let wtf = $(node).children('.notexport').text();
                                let txt = $(node).text();
                                return txt.includes(wtf) ? txt.replace(wtf, '') : txt;
                            }
                        },
                        /**Sonarqube: columns: ":not(.notexport)", **/
                        columns: ":not(.responseException)",
                    },
                }, 
                {
                    extend: "excel",
                    // filename: 'RPA Dashboard'
                    filename : function(){
                        if(locale === 'tr'){
                            var myFile = 'RPA Dashboard - Veriler';
                        } else if(locale === 'en'){
                            var myFile = 'RPA Dashboard - Jobs';
                        }
                        return myFile;
                    },
                    title : function(){
                        if(locale === 'tr'){
                            var myTitle = 'RPA Dashboard - Veriler';
                        } else if(locale === 'en'){
                            var myTitle = 'RPA Dashboard - Jobs';
                        }
                        return myTitle;
                    }
                }
            ),
        ],
        pageLength: 15,
        rowReorder: {
            selector: ".reorder",
        },
        columnDefs: [{
                width: "5%",
                targets: "status"
            },
            {
                width: "3%",
                targets: "notexport"
            },
            {
                width: "3%",
                targets: "responseException"
            }
        ],
        createdRow: function (row, data, dataIndex) {
            if (!row.classList.contains("notorder") && !data[0]) {
                data[0] = dataIndex + 1;
                $(row).children("td:first").addClass("reorder").text(data[0]);
            }
        },
        paging: false,
        info: false,
        searching: false,
        ordering: location.pathname.split("/")[1] === "table-column-model" ? true : false,
        colReorder: {
            allowReorder: false
        },
    });
    //Remove no-wrap class from tables for smaller col sizes
    $('.multi-col-order').each(function () {
        $(this).removeClass('no-wrap')
    });
    // Resizeable Columns colResizable-1.6.nmin.js
    $(function () {
        $(".multi-col-order").colResizable({
            resizeMode: "overflow"
        });
    });
    if ($('table.multi-col-order').length) {
        // Static Table Height for horizontal scroll
        $('.table-responsive').css('max-height', '600px').css('min-height', 'min-content')
    }
    // Table Column Header Text will not break
    $('.multi-col-order th,.multi-col-order td').each(function () {
        $(this).css('overflow', 'hidden').css('white-space', 'nowrap').css('text-overflow', 'ellipsis')
    });

    /**
     * EMIR IS KING!
     */
    function changeDataTable(page = 1) {
        window.location.href = '?q=' + encodeURIComponent(JSON.stringify((getHrefFromQuery(page))));
    }

    function allDataExport() {
        var hrefData = getHrefFromQuery(1);
        hrefData.exportType = 'xlsx';
        hrefData.isAllDataExport = 1;
        jQuery.ajax({
            url: window.location.pathname + '?q=' + encodeURIComponent(JSON.stringify((hrefData))),
            type: 'GET',
            success: function (data) {
                $.confirm({
                    title: '',
                    icon: 'fa fa-info-circle',
                    type: 'blue',
                    content: i18n['AsyncOperationMessage'],
                    buttons: {
                        okey: {
                            text: i18n['Okey'],
                            btnClass: 'btn-blue',
                            keys: ['enter', 'shift'],
                            action: function () {
                                return true;
                            }
                        }
                    }
                });
            },
            error: function (error) {
                $.confirm({
                    title: '',
                    icon: 'fa fa-info-circle',
                    content: i18n['500'] + error.responseText,
                    buttons: {
                        okey: {
                            text: i18n['Okey'],
                            btnClass: 'btn-blue',
                            keys: ['enter', 'shift'],
                            action: function () {
                                return true;
                            }
                        }
                    }
                });
            }
        });
    }

    function getHrefFromQuery(page = 1) {
        let limit = $('.table-length-select').children(':selected').val() || 15;
        let offset = 0;

        if (page && page > 1) {
            offset = limit * (page - 1);
        }

        let asc = [];
        let desc = [];
        $('.multi-col-order thead th').each(function () {
            var name = $(this).data('name');
            if ($(this).hasClass('sorting_asc')) {
                asc.push(name);
            } else if ($(this).hasClass('sorting_desc')) {
                desc.push(name);
            }
        });

        let search = [];
        $('.table-search-field').each(function () {
            var field = $(this).data('field');
            var value = ($(this).hasClass("price-element") && $(this).val() !== '') ? parseFloat($(this).val().replace(',', '').toString()) : $(this).val();
            var operation = $(this).parent().prev().children(':selected').val();
            if (value && field) {
                search.push({
                    key: field,
                    operation: operation,
                    value: value
                });
            }
        });
        $('.table-search-field-group > select[data-key]').each(function () {
            var field = $(this).data('key');
            var value = $(this).children(':selected').val();
            if (value && field) {
                if (field == 'approvalStatus' && value == 'all') {
                    search.push({
                        key: field,
                        operation: '!=',
                        value: 'C'
                    });
                } else if (value == 'all') {
                    search.push({
                        key: field,
                        operation: 'notNull',
                        value: value
                    });
                } else {
                    search.push({
                        key: field,
                        operation: '==',
                        value: value
                    });
                }
            }
        });

        let hrefData = {
            limit: limit,
            offset: offset
        };
        if (asc.length > 0 || desc.length > 0) hrefData.sort = {};
        if (asc.length > 0) hrefData.sort.asc = asc;
        if (desc.length > 0) hrefData.sort.desc = desc;
        if (search.length > 0) hrefData.search = search;
        return hrefData;
    }

    function getQueryFromHref() {
        var url = window.location.href;
        var name = 'q';
        var regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'),
            results = regex.exec(url);
        if (!results) return null;
        if (!results[2]) return '';
        return JSON.parse(decodeURIComponent(results[2].replace(/\+/g, ' ')));
    }

    /**
     * pagination
     */
    $('.table-length-select').change(function (e) {
        changeDataTable();
    });
    $('a.page-link').on('click', function (e) {
        var page = $(this).data('page');
        if (page)
            changeDataTable(page);
    });
    /**
     * sortable
     */

    $('.multi-col-order thead th').each(function (index) {
        var query = getQueryFromHref();
        var name = $(this).data('name');
        var sortable = $(this).data('sortable') || 'off';

        if (sortable == 'on') {
            $(this).addClass('order sorting');

            if (query != null && query.sort != null && query.sort.asc != null)
                for (let i = 0; i < query.sort.asc.length; i++) {
                    if (name == query.sort.asc[i])
                        $(this).addClass('sorting_asc');
                }
            if (query != null && query.sort != null && query.sort.desc != null)
                for (let i = 0; i < query.sort.desc.length; i++) {
                    if (name == query.sort.desc[i])
                        $(this).addClass('sorting_desc');
                }
        }
    });
    $('.multi-col-order thead th').on('click', function (e) {
        e.stopPropagation();
        e.preventDefault();
        if ('TH' == e.target.tagName) {
            if ($(this).hasClass('order sorting')) {
                Array.from(e.target.parentNode.childNodes)
                    .filter(function (o) {
                        return o !== e.target
                    }).forEach(function (e1) {
                        e1.classList.remove("sorting_asc", "sorting_desc")
                    });
                if ($(this).hasClass('sorting_asc')) {
                    $(this).addClass('sorting_desc');
                    $(this).removeClass('sorting_asc');
                } else if ($(this).hasClass('sorting_desc')) {
                    $(this).removeClass('sorting_desc');
                } else {
                    $(this).addClass('sorting_asc');
                }
                changeDataTable();
            }
        }
    });
    /**
     * searchable
     */
    $('.multi-col-order thead th').each(function () {
        var query = getQueryFromHref();
        var name = $(this).data('name');
        var type = $(this).data('type');
        var searchable = $(this).data('searchable') || 'off';

        if (searchable == 'on') {
            let val = '';
            let operation = 'like';
            if (query != null && query.search != null)
                for (let i = 0; i < query.search.length; i++) {
                    if (name == query.search[i].key) {
                        val = query.search[i].value;
                        operation = query.search[i].operation;
                    }
                }

            let html = '<div class="input-group table-search-field-group notexport">';

            if (name == 'status') {
                html += '<select class="custom-select form-control" data-key="status">' +
                    '<option value="all" ' + (val == 'all' ? 'selected' : '') + '>' + i18n['All'] + '</option>' +
                    '<option value="1" ' + (val == '1' ? 'selected' : '') + '>' + i18n['Active'] + '</option>' +
                    '<option value="2" ' + (val == '2' ? 'selected' : '') + '>' + i18n['Passive'] + '</option>' +
                    '</select>';
            } else if (name == 'userFeature') {
                html += '<select class="custom-select form-control" data-key="userFeature">' +
                    '<option value="all" ' + (val == 'all' ? 'selected' : '') + '>' + i18n['All'] + '</option>' +
                    '<option value="1" ' + (val == '1' ? 'selected' : '') + '>' + i18n['Entrant'] + '</option>' +
                    '<option value="2" ' + (val == '2' ? 'selected' : '') + '>' + i18n['Approver'] + '</option>' +
                    '</select>';
            } else if (name == "subject") {
                html += '<select class="custom-select form-control" data-key="subject">' +
                    '<option value="all" ' + (val == 'all' ? 'selected' : '') + '>' + i18n['All'] + '</option>' +
                    '<option value="Cross Checks" ' + (val == 'Cross Checks' ? 'selected' : '') + '>' + i18n['crossChecks'] + '</option>' +
                    '<option value="Balance Sheet Reconciliation Checks" ' + (val == 'Balance Sheet Reconciliation Checks' ? 'selected' : '') + '>' + i18n['balanceSheetReconciliationChecks'] + '</option>' +
                    '</select>';
            } else if (name == 'reconciliationCheckSubject') {
                html += '<select class="custom-select form-control" data-key="reconciliationCheckSubject">' +
                    '<option value="all" ' + (val == 'all' ? 'selected' : '') + '>' + i18n['All'] + '</option>' +
                    '<option value="Cross Checks" ' + (val == 'Cross Checks' ? 'selected' : '') + '>' + i18n['crossChecks'] + '</option>' +
                    '<option value="Balance Sheet Reconciliation Checks" ' + (val == 'Balance Sheet Reconciliation Checks' ? 'selected' : '') + '>' + i18n['balanceSheetReconciliationChecks'] + '</option>' +
                    '</select>';
            } else if (name == "reportType") {
                html += '<select class="custom-select form-control" data-key="reportType">' +
                    '<option value="all" ' + (val == 'all' ? 'selected' : '') + '>' + i18n['All'] + '</option>' +
                    '<option value="Daily" ' + (val == 'Daily' ? 'selected' : '') + '>' + i18n['Daily'] + '</option>' +
                    '<option value="Monthly" ' + (val == 'Monthly' ? 'selected' : '') + '>' + i18n['Monthly'] + '</option>' +
                    '</select>';
            } else if (name == 'approvalStatus') {
                html += '<select class="custom-select form-control" data-key="approvalStatus">' +
                    '<option value="all" ' + ((val == 'all') || (val == 'C' && operation == '!=') ? 'selected' : '') + '>' + i18n['All'] + '</option>' +
                    '<option value="N" ' + (val == 'N' ? 'selected' : '') + '>' + i18n['NewApproval'] + '</option>' +
                    '<option value="W" ' + (val == 'W' ? 'selected' : '') + '>' + i18n['Waiting Approval'] + '</option>' +
                    '<option value="C" ' + ((val == 'C' && operation != '!=') ? 'selected' : '') + '>' + i18n['Canceled'] + '</option>' +
                    '<option value="A" ' + (val == 'A' ? 'selected' : '') + '>' + i18n['Approved'] + '</option>' +
                    '<option value="R" ' + (val == 'R' ? 'selected' : '') + '>' + i18n['Rejected'] + '</option>' +
                    '<option value="I" ' + (val == 'I' ? 'selected' : '') + '>' + i18n['Inspected'] + '</option>' +
                    '</select>';
            } else if (name == 'screenCode' && typeof screenCodeList !== 'undefined' && screenCodeList && screenCodeList.length > 0) {
                html += '<select class="js-multiple-select custom-select form-control" data-key="screenCode">' +
                    '<option value="all" ' + (val == 'all' ? 'selected' : '') + '>' + i18n['All'] + '</option>';
                for (let t in screenCodeList) {
                    html += '<option value="' + screenCodeList[t] + '" ' + (val == screenCodeList[t] ? 'selected' : '') + '>' + i18n[screenCodeList[t]] + '</option>';
                }
                html += '</select>';
            } else if (name == 'tableName' && typeof tableNameList !== 'undefined' && tableNameList && tableNameList.length > 0) {
                html += '<select class="js-multiple-select custom-select form-control" data-key="tableName">' +
                    '<option value="all" ' + (val == 'all' ? 'selected' : '') + '>' + i18n['All'] + '</option>';
                for (let t in tableNameList) {
                    html += '<option value="' + tableNameList[t] + '" ' + (val == tableNameList[t] ? 'selected' : '') + '>' + i18n['model.' + tableNameList[t]] + '</option>';
                }
                html += '</select>';
            } else if (name == 'tableNameDummy' && typeof tableNameWithIdList !== 'undefined' && tableNameWithIdList && tableNameWithIdList.length > 0) {
                html += '<select class="js-multiple-select custom-select form-control" data-key="tableNameDummy">' +
                    '<option value="all" ' + (val == 'all' ? 'selected' : '') + '>' + i18n['All'] + '</option>';
                for (let t in tableNameWithIdList) {
                    html += '<option value="' + tableNameWithIdList[t].uuid + '" ' + (val == tableNameWithIdList[t].uuid ? 'selected' : '') + '>' + i18n['model.' + tableNameWithIdList[t].name] + '</option>';
                }
                html += '</select>';
            } else if (name == 'username' && typeof userList !== 'undefined' && userList && userList.length > 0) {
                html += '<select class="js-multiple-select custom-select form-control" data-key="username">' +
                    '<option value="all" ' + (val == 'all' ? 'selected' : '') + '>' + i18n['All'] + '</option>';
                for (let u in userList) {
                    html += '<option value="' + userList[u].uuid + '" ' + (val == userList[u].uuid ? 'selected' : '') + '>' + userList[u].username + '</option>';
                }
                html += '</select>';

            } else if (name == 'subsidiaries' && typeof subsidiaryList !== 'undefined' && subsidiaryList && subsidiaryList.length > 0) {
                html += '<select class="js-multiple-select custom-select form-control" data-key="subsidiaries">' +
                    '<option value="all" ' + (val == 'all' ? 'selected' : '') + '>' + i18n['All'] + '</option>';
                for (let s in subsidiaryList) {
                    html += '<option value="' + subsidiaryList[s].uuid + '" ' + (val == subsidiaryList[s].uuid ? 'selected' : '') + '>' + subsidiaryList[s].formalName + '</option>';
                }
                html += '</select>';
            } else if (name == 'operations' && typeof operationList !== 'undefined' && operationList && operationList.length > 0) {

                html += '<select class="js-multiple-select custom-select form-control" data-key="operations">' +
                    '<option value="all" ' + (val == 'all' ? 'selected' : '') + '>' + i18n['All'] + '</option>';
                for (let o in operationList) {
                    html += '<option value="' + operationList[o].uuid + '" ' + (val == operationList[o].uuid ? 'selected' : '') + '>' + i18n['description.uri.' + operationList[o].method + operationList[o].path] + '</option>';
                }
                html += '</select>';
            } else if (name == 'to' && typeof roleList !== 'undefined' && roleList && roleList.length > 0) {

                html += '<select class="js-multiple-select custom-select form-control" data-key="to">' +
                    '<option value="all" ' + (val == 'all' ? 'selected' : '') + '>' + i18n['All'] + '</option>';
                for (let r in roleList) {
                    html += '<option value="' + roleList[r].uuid + '" ' + (val == roleList[r].uuid ? 'selected' : '') + '>' + roleList[r].code + '</option>';
                }
                html += '</select>';
            } else if (name == 'cc' && typeof roleList !== 'undefined' && roleList && roleList.length > 0) {

                html += '<select class="js-multiple-select custom-select form-control" data-key="cc">' +
                    '<option value="all" ' + (val == 'all' ? 'selected' : '') + '>' + i18n['All'] + '</option>';
                for (let r in roleList) {
                    html += '<option value="' + roleList[r].uuid + '" ' + (val == roleList[r].uuid ? 'selected' : '') + '>' + roleList[r].code + '</option>';
                }
                html += '</select>';
            } else if (name == 'bcc' && typeof roleList !== 'undefined' && roleList && roleList.length > 0) {

                html += '<select class="js-multiple-select custom-select form-control" data-key="bcc">' +
                    '<option value="all" ' + (val == 'all' ? 'selected' : '') + '>' + i18n['All'] + '</option>';
                for (let r in roleList) {
                    html += '<option value="' + roleList[r].uuid + '" ' + (val == roleList[r].uuid ? 'selected' : '') + '>' + roleList[r].code + '</option>';
                }
                html += '</select>';
            } else if (name == 'type' && typeof typeList !== 'undefined' && typeList && typeList.length > 0) {

                html += '<select class="js-multiple-select custom-select form-control" data-key="type">' +
                    '<option value="all" ' + (val == 'all' ? 'selected' : '') + '>' + i18n['All'] + '</option>';
                for (let t in typeList) {
                    html += '<option value="' + typeList[t].key + '" ' + (val == typeList[t].key ? 'selected' : '') + '>' + i18n[typeList[t].value] + '</option>';
                }
                html += '</select>';
            } else {
                html += '<select class="custom-select form-control">' +
                    '<option value="==" ' + (operation == '==' ? 'selected' : '') + '>==</option>' +
                    '<option value="!=" ' + (operation == '!=' ? 'selected' : '') + '>!=</option>' +
                    (type == "text" || (name == "accountType" || name == "dpdNinetyFlg" || name == "revocableFlg" || name == "currencyCode") ? null :
                        '<option value=">=" ' + (operation == '>=' ? 'selected' : '') + '>>=</option>' +
                        '<option value=">" ' + (operation == '>' ? 'selected' : '') + '>></option>' +
                        '<option value="<" ' + (operation == '<' ? 'selected' : '') + '><</option>' +
                        '<option value="<=" ' + (operation == '<=' ? 'selected' : '') + '><=</option>') +
                    '<option value="isNull" ' + (operation == 'isNull' ? 'selected' : '') + '>isNull</option>' +
                    '<option value="notNull" ' + (operation == 'notNull' ? 'selected' : '') + '>notNull</option>';
                if (type != "amount") {
                    html += (type == "number" || type == "date" ? null :
                        '<option value="like" ' + (operation == 'like' ? 'selected' : '') + '>like</option>' +
                        '<option value="notLike" ' + (operation == 'notLike' ? 'selected' : '') + '>notLike</option>' +
                        '<option value="in" ' + (operation == 'in' ? 'selected' : '') + '>in</option>' +
                        '<option value="notIn" ' + (operation == 'notIn' ? 'selected' : '') + '>notIn</option>');
                }
                if (type == "amount") {
                    html += '<option value="like" ' + (operation == 'like' ? 'selected' : '') + '>like</option>' +
                        '<option value="notLike" ' + (operation == 'notLike' ? 'selected' : '') + '>notLike</option>';
                }
                let searchInputClass = "table-search-field form-control";
                if (type == "date") {
                    searchInputClass += " datepicker"
                }

                if (type == "amount") {
                    searchInputClass += " price-element";
                }

                html += '</select>' +
                    '<div class="btn-group" ' + (operation === 'isNull' || operation === 'notNull' ? 'style="display: none;">' : '>') +
                    '<input type="text" data-field="' + name + '" class="' + searchInputClass + '" placeholder="Search" value="' + val + '" />' +
                    '<span class="table-search-field-clear far fa-times-circle"></span>' +
                    '</div>';
            }

            html += "</div><br/>";

            $(this).prepend(html);
            makeSelect2();
            makePriceFormat();

            /*if(!query && name == 'approvalStatus') {
                console.log($(this).find('select'))
                $(this).find('select').trigger('change');
            }*/
        }
    });

    $('.btn-group > .datepicker').on('change', function (e) {
        e.stopPropagation();
        e.preventDefault();
        changeDataTable();
    });

    $('.table-search-field-group > select').on('change', function (e) {
        e.stopPropagation();
        e.preventDefault();
        var key = $(this).data('key');
        var value = $(this).children(':selected').val();
        if (key) {
            changeDataTable();
        } else if ('isNull' === value || 'notNull' === value) {
            $(this).next().hide();
            $(this).next().children('input').val(value);
            changeDataTable();
        } else {
            $(this).next().show();
            $(this).next().children('input').val('');
        }
    });
    $('.table-search-field').on('click', function (e) {
        e.stopPropagation();
        e.preventDefault();
    });
    $('.table-search-field').on('keypress', function (e) {
        if (e.keyCode === 13) {
            e.stopPropagation();
            e.preventDefault();
            changeDataTable();
        }
    });
    $('.table-search-field-clear').on('click', function (e) {
        $(this).prev().val('');
        $(this).parent().prev().val('==');
        changeDataTable();
    });
    /**
     *
     */
    $("#logo").fileinput({
        language: locale,
        overwriteInitial: true,
        maxFileSize: 5000,
        maxImageWidth: 512,
        maxImageHeight: 512,
        theme: "fa",
        showClose: false,
        showCaption: false,
        showBrowse: false,
        fileActionSettings: {
            showZoom: false,
        },
        showUpload: false,
        browseOnZoneClick: true,
        removeLabel: "",
        removeIcon: '<i class="fas fa-trash-alt"></i>',
        removeTitle: "Cancel or reset changes",
        msgErrorClass: "alert alert-block alert-danger",
        defaultPreviewContent: typeof subsidiary !== "undefined" && subsidiary.img ?
            '<img class="w-100 h-auto" src="data:image/jpeg;base64,' + subsidiary.img + '"alt="' + subsidiary.formalName + '">' : '<img class="w-100 h-auto" src="/assets/images/gallery/company.png" alt="company">',
        layoutTemplates: {
            main2: "{preview} " + " {remove} {browse}"
        },
        allowedFileExtensions: ["png"],
    });

    $("#photo").fileinput({
        language: locale,
        overwriteInitial: true,
        maxFileSize: 5000,
        theme: "fa",
        showClose: false,
        showCaption: false,
        showBrowse: false,
        fileActionSettings: {
            showZoom: false,
        },
        showUpload: false,
        browseOnZoneClick: true,
        removeLabel: "",
        removeIcon: '<i class="fas fa-trash-alt"></i>',
        removeTitle: "Cancel or reset changes",
        msgErrorClass: "alert alert-block alert-danger",
        layoutTemplates: {
            main2: "{preview} " + " {remove} {browse}"
        },
        defaultPreviewContent: typeof user !== "undefined" && user.img ?
            '<img class="w-100 h-auto" src="data:image/jpeg;base64,' + user.img + '" alt="' + user.name + '">' : '<h6 class="text-muted">' + i18n["Photo"] + "</h6>",
        allowedFileExtensions: ["png"],
    });

    $(".file-document-input").fileinput({
        language: locale,
        theme: "fa",
        showPreview: false,
        showCancel: false,
        showUpload: false,
        elErrorContainer: "#errorBlock",
        mainClass: "input-group-sm"
    });

    $(".multi-col-order tbody").on("click", "#responseException", function () {
        var tr = $(this).closest("tr");
        var row = table.row(tr);
        if (row.child.isShown()) {
            row.child.hide();
            tr.removeClass("shown");
        } else {
            row.child(row.data()[row.data().length - 1]).show();
            tr.addClass("shown");
        }
    });

    $(document).on("click", "#ruleConditionAddNewRow", function () {
        $("#table-conditions")
            .DataTable()
            .row.add([
                "",
                "<select class='js-multiple-select js-states form-control' name='key::'>" +
                getKeyOptionsHTML() +
                "</select>",
                "<select class='form-control' name='operator::'>" +
                "<option value='==' data-type='text'>" + "==" + "</option>" +
                "<option value='!=' data-type='text'>" + "!=" + "</option>" +
                "<option value='>' data-type='text'>" + ">" + "</option>" +
                "<option value='>=' data-type='text'>" + ">=" + "</option>" +
                "<option value='<' data-type='text'>" + "<" + "</option>" +
                "<option value='<=' data-type='text'>" + "<=" + "</option>" +
                "<option value='minLength' data-type='number'>" + "minLength" + "</option>" +
                "<option value='maxLength' data-type='number'>" + "maxLength" + "</option>" +
                "<option value='isNumeric' data-type='bool'>" + "isNumeric" + "</option>" +
                "<option value='isAlpha' data-type='bool'>" + "isAlpha" + "</option>" +
                "<option value='isAlphaNumeric' data-type='bool'>" + "isAlphaNumeric" + "</option>" +
                "<option value='isDate' data-type='bool'>" + "isDate" + "</option>" +
                "<option value='isNotNull' data-type='bool'>" + "isNotNull" + "</option>" +
                "<option value='isUnique' data-type='bool'>" + "isUnique" + "</option>" +
                "<option value='lookup' data-type='text'>" + "lookup" + "</option>" +
                "<option value='matches' data-type='text'>" + "matches" + "</option>" +
                "<option value='in' data-type='text'>" + "in" + "</option>" +
                "<option value='notIn' data-type='text'>" + "notIn" + "</option>" +
                "</select>",
                "<input class='form-control' type='text' name='value::'>",
                "<select class='form-control' name='status::'>" +
                "<option value='1'>" +
                i18n["Active"] +
                "</option>" +
                "<option value='2'>" +
                i18n["Passive"] +
                "</option>" +
                "<option value='9'>" +
                i18n["Deleted"] +
                "</option>" +
                "</select>",
                "<button class='btn btn-sm btn-outline-danger ruleConditionDeleteRow' type='button'><i class='fas fa-trash-alt'></i></button>",
            ])
            .draw(false);
        makeSelect2();
    });
    $(document).on("click", "#ruleExpressionConditionAddNewRow", function () {
        $("#table-expressionConditions")
            .DataTable()
            .row.add([
                "",
                "<input class='form-control' type='text' name='expression::'>",
                "<select class='form-control' name='status::'>" +
                "<option value='1'>" +
                i18n["Active"] +
                "</option>" +
                "<option value='2'>" +
                i18n["Passive"] +
                "</option>" +
                "<option value='9'>" +
                i18n["Deleted"] +
                "</option>" +
                "</select>",
                "<button class='btn btn-sm btn-outline-danger ruleConditionDeleteRow' type='button'><i class='fas fa-trash-alt'></i></button>",
            ])
            .draw(false);
        makeSelect2();
    });
    $(document).on("click", "#ruleQueryConditionAddNewRow", function () {
        var queryConditionTable = $("#table-queryConditions");
        var row = queryConditionTable.DataTable().row.add([
            "",
            "<textarea class='sql-editor'></textarea>",
            "<select class='form-control' name='status::'>" +
            "<option value='1'>" + i18n["Active"] + "</option>" +
            "<option value='2'>" + i18n["Passive"] + "</option>" +
            "<option value='9'>" + i18n["Deleted"] + "</option>" +
            "</select>",
            "<button class='btn btn-sm btn-outline-danger ruleConditionDeleteRow' type='button'><i class='fas fa-trash-alt'></i></button>",
        ]).node();
        queryConditionTable.DataTable().draw(false);
        makeSelect2();
        makeSqlEditor($(row).find('.sql-editor').get(0));
    });
    $(document).on("click", ".ruleConditionDeleteRow", function (e) {
        var table1 = $(this).closest("table").DataTable();
        table1.row($(this).parents("tr")).remove().draw();
        var arr = [];
        table1.rows().every(function (rowIdx, tableLoop, rowLoop) {
            var data = [];
            $(this.node())
                .children()
                .each(function (i1, v) {
                    if (v.children.length > 0) {
                        var $child = $(v).children();
                        if ($child.is("input")) {
                            $child.attr("value", $child.val());
                        } else if ($child.is("select")) {
                            $child.removeClass("select2-hidden-accessible");
                            var $selected = $child.find("option:selected");
                            $child
                                .find("option")
                                .toArray()
                                .forEach(function (opt) {
                                    return opt.removeAttribute("selected");
                                });
                            if ($selected.get(0)) {
                                $child
                                    .children('option[value="' + $selected.val() + '"]')
                                    .attr("selected", "selected");
                            }
                        }
                        data[i1] = $child.get(0).outerHTML;
                    } else data[i1] = "";
                });
            arr[rowLoop] = data;
        });
        table1.clear().draw();
        arr.forEach(function (d) {
            table1.row.add(d);
        });
        table1.draw(false);
        makeSelect2();
    });
    var previousTypeOfSelectedOption;
    $(document).on("focus", 'select[name="operator::"]', function (e) {
        previousTypeOfSelectedOption = $(this).children("option:selected").data("type");
    }).on("change", 'select[name="operator::"]', function (e) {
        var $this = $(this),
            currentTypeOfSelectedOption = $this.children("option:selected").data("type");
        if (previousTypeOfSelectedOption !== currentTypeOfSelectedOption) {
            var td = $this.closest("td").next();
            td.empty();
            td.append(getInputBySelectedOptionType(currentTypeOfSelectedOption));
            previousTypeOfSelectedOption = currentTypeOfSelectedOption;
            makeSelect2();
        }
    });

    function getInputBySelectedOptionType(type) {
        var input;
        switch (type) {
            case "text":
                input = "<input class='form-control' name='value::'>";
                break;
            case "number":
                input =
                    "<input class='form-control' type='number' name='value::' min='0'>";
                break;
        }
        return input;
    }

    function getKeyOptions() {
        var columns = [],
            dom = $("#rule-operations");
        if (dom && dom.length > 0) {
            var operation = operations.filter((element) => $("#rule-operations").val().includes(element.uuid));
            if (Array.isArray(operation) && operation.length > 0) {
                columns = _.chain(operation)
                    .map(function (item) {
                        return item.table.columns;
                    })
                    .flatten()
                    .countBy("name")
                    .pick(function (count) {
                        return count === operation.length;
                    })
                    .value();
            }
        }
        return columns;
    }

    function getKeyOptionsHTML() {
        var result = "";
        _.each(_.keys(getKeyOptions()), function (column1) {
            result += '<option value="' + column1 + '">' + column1 + "</option>";
        });
        return result;
    }

    if (typeof operations !== "undefined" && operations && _.isArray(operations) && operations.length > 0)
        setBasicConditionsValues();

    function setBasicConditionsValues() {
        var columns = getKeyOptions();
        _.each($('[name="key::"]').find("option"), function (o) {
            if (!_.contains(_.keys(columns), o.value)) o.remove();
        });
    }

    $("#rule").on("submit", function (e) {
        var conditions = [];
        $.fn.dataTable.tables().forEach(function (table2) {
            var data = [];
            var values = $(table2).find("input, select").serializeArray();
            var queries = [];
            Array.prototype.slice.call($(table2).find('.sql-editor')).forEach(function (editor) {
                queries.push(getCodeMirrorValueFromEditor(editor));
            });
            var start = null;
            var row = {};
            var order = 1;
            $.each(values, function () {
                this.name = this.name.replace(/:/g, "");
                if (start == this.name) {
                    start = null;
                    if (_.isArray(queries) && !_.isEmpty(queries)) {
                        row["query"] = queries[order - 1];
                    }
                    row["ruleOrder"] = order++;
                    data.push($.extend({}, row));
                    row = {};
                }
                if (!start) start = this.name;
                row[this.name] = this.value;
            });
            if (row && Object.keys(row).length > 0) {
                //last record
                if (_.isArray(queries) && !_.isEmpty(queries)) {
                    row["query"] = queries[order - 1];
                }
                row["ruleOrder"] = order++;
                data.push(row);
            }
            conditions.push(data);
            $("#".concat(table2.id.split("-")[1])).val(JSON.stringify(data));
        });
        return !_.isEmpty(_.flatten(conditions));
    });

    $(document).on("click", "button.exportToExcel", function () {
        var card = this.closest(".card"),
            parent = $(card).find("table");
        if (card && parent)
            $(parent).DataTable().button(".buttons-excel").trigger();
        else table.button(".buttons-excel").trigger();
    });
    $('button.allDataExportToExcel').on('click', function (e) {
        e.stopPropagation();
        e.preventDefault();
        allDataExport();
    });
    $("#file-input").fileinput({
        language: locale,
        theme: "fa",
        showPreview: false,
        showCancel: false,
        placeholder: "test",
        elErrorContainer: "#errorBlock",
        mainClass: "input-group-sm",
        allowedFileExtensions: ["xlsx"],
    });
    $("html").on("click", ".fileinput-upload-button", function (e) {
        e.preventDefault();
        $("<button>").attr({
            type: "submit",
            name: "action",
            value: "import",
        }).hide().appendTo($(e.currentTarget).parents("form:first")).click();
    });
    $(".alert-success").fadeOut(2500);
    $("#rule-operations").on("change", function () {
        var result = "";
        _.each(_.keys(getKeyOptions()), function (column1) {
            return (result +=
                '<option value="' + column1 + '">' + column1 + "</option>");
        });
        $('[name="key::"]').find("option").remove().end().append(result);
    });

    $(".input-phone").on("input", function () {
        if (/\D/g.test(this.value)) {
            this.value = this.value.replace(/\D/g, "");
        }
    });

    $("#notificationMailTemplate").on("submit", function (e) {
        /**Sonarqube: var data = []; **/
        var values = $("#notificationMailTemplateAttr")
            .$("input, select")
            .serializeArray();
        $("#attrs").val(JSON.stringify(values));
    });

    $(document).on("click", ".notificationTemlateMailAttrDeleteRow", function () {
        $("#notificationDefinition")
            .DataTable()
            .row($(this).parents("tr"))
            .remove()
            .draw();
        var arr = [];
        $("#notificationDefinition")
            .DataTable()
            .rows()
            .every(function (rowIdx, tableLoop, rowLoop) {
                var data = [];
                $(this.node())
                    .children()
                    .each(function (i1, v) {
                        if (v.children.length > 0) {
                            var $child = $(v).children();
                            if ($child.is("input")) {
                                $child.attr("value", $child.val());
                            } else if ($child.is("select")) {
                                $child.removeClass("select2-hidden-accessible");
                                var $selected = $child.find("option:selected");
                                $child
                                    .find("option")
                                    .toArray()
                                    .forEach(function (opt) {
                                        return opt.removeAttribute("selected");
                                    });
                                if ($selected.get(0)) {
                                    $child
                                        .children(
                                            'option[value="' +
                                            $selected.val() +
                                            '"]' +
                                            ($selected.data("value") ?
                                                '[data-value="' + $selected.data("value") + '"]' :
                                                "")
                                        )
                                        .attr("selected", "selected");
                                }
                            }
                            data[i1] = $child.get(0).outerHTML;
                        } else data[i1] = "";
                    });
                arr[rowLoop] = data;
            });
        $("#notificationDefinition").DataTable().clear().draw();
        arr.forEach(function (d) {
            $("#notificationDefinition").DataTable().row.add(d);
        });
        $("#notificationDefinition").DataTable().draw(false);
        makeSelect2();
    });

    function getOperationOptions() {
        var result = "";
        let i = 0;
        if (operations) {
            operations.forEach(function (c) {
                result +=
                    '<option data-tableName="' +
                    c.table.name +
                    '" value="' +
                    c.uuid +
                    '" data-value="' +
                    c.uuid +
                    '">' +
                    (i18n["description.uri." + c.method + c.path] || c.method + c.path) +
                    "</option>";
                if (i == 0) {
                    /**Sonarqube:  operationTableName = c.table.name; **/
                }
                i++;
                return result;
            });
        }
        return result;
    }

    var definitionIndex;
    $(document).on("click", "#notificationDefinitionAddNewRow", function () {
        $("#notificationDefinition")
            .DataTable()
            .row.add([
                "",
                "<select class='js-multiple-select js-states form-control' name='definitions[" +
                definitionIndex +
                "][operationUuid]'>" +
                getOperationOptions() +
                "</select>",
                "<select class='form-control' name='definitions[" +
                definitionIndex +
                "][status]'>" +
                "<option value='1'>" +
                i18n["Active"] +
                "</option>" +
                "<option value='2'>" +
                i18n["Passive"] +
                "</option>" +
                "<option value='9'>" +
                i18n["Deleted"] +
                "</option>" +
                "</select>",
                "<a onclick=\"getTableDetails(document.getElementsByName('definitions[" +
                definitionIndex +
                "][operationUuid]')[0].selectedOptions[0].getAttribute('data-tablename')); return false;\" href='#'>" +
                i18n["Show"] +
                "</a>",
                "<button class='btn btn-sm btn-outline-danger notificationTemlateMailAttrDeleteRow' type='button'><i class='fas fa-trash-alt'></i></button>",
            ])
            .draw(false);
        makeSelect2();
        definitionIndex = definitionIndex + 1;
    });

    $(document).on("click", "#announcementAddAllSubsidiary", function () {
        $(".select2-search__field").click();
        var options = $("#subsidiaryUuIdSelect")
            .find("option")
            .prop("selected", true);
        for (let i = 0; i < options.length; i++) {
            var o1 =
                '<li class="select2-selection__choice" title="' +
                options[i].label +
                '" data-select2-id=' +
                options[i].getAttribute("data-select2-id") +
                '><span class="select2-selection__choice__remove" role="presentation">×</span>' +
                options[i].label +
                "</li>";
            $(".select2-search__field").before(o1);
        }
        makeSelect2();
    });

    // $(document).ready(function () {
    //     var userTypeHidden = $("input[name=userTypeHidden]").val();
    //     var userType = userTypeHidden;
    //     if (userType === "0") {
    //         $("#subsidiaryList").hide();
    //         $("#userRoleFeature").hide();
    //         $("#userType0").prop("checked", true);
    //     } else {
    //         $("#subsidiaryList").show();
    //         $("#userRoleFeature").show();
    //         $("#userType1").prop("checked", true);
    //     }
    //     $("input[name=userType]").on("change", function () {
    //         var val = $(this).val();
    //         if (val === "0") {
    //             $("#subsidiaryList").hide();
    //             $("#userRoleFeature").hide();
    //         } else {
    //             $("#subsidiaryList").show();
    //             $("#userRoleFeature").show();
    //         }
    //     });
    // });

    $("input[name=officePhone]").on('input', function () {
        var text = $("input[name=officePhone]");
        var textLastValue = text.val().charAt(text.val().length - 2);
        var firstValue = text.val().substring(0, 1);
        if (/\D/g.test(this.value) || /\d/g.test(firstValue)) {
            if (/\d/g.test(firstValue)) {
                this.value = this.value.replace(/(\d)/g, "");
            }
            this.value = this.value.replace(/[^+0-9S]/g, "");
            this.value = this.value.replace(/(\d\+)/g, textLastValue);
            this.value = this.value.replace(/(\+\+)/g, "+");
        }
    });
    $("#financialToggle").attr("checked", false);
    $("#nonFinancialToggle").attr("checked", false);
    $("#organizationLogo").fileinput({
        language: locale,
        overwriteInitial: true,
        maxFileSize: 5000,
        maxImageWidth: 512,
        maxImageHeight: 512,
        theme: "fa",
        showClose: false,
        showCaption: false,
        showBrowse: false,
        fileActionSettings: {
            showZoom: false,
        },
        showUpload: false,
        browseOnZoneClick: true,
        removeLabel: "",
        removeIcon: '<i class="fas fa-trash-alt"></i>',
        removeTitle: "Cancel or reset changes",
        msgErrorClass: "alert alert-block alert-danger",
        defaultPreviewContent: typeof organization !== "undefined" && organization.img ?
            '<img class="w-100 h-auto" src="data:image/jpeg;base64,' + organization.img + '"' + ' alt="' + organization.name + '">' : '<img class="w-100 h-auto" src="/assets/images/gallery/company.png" alt="company">',
        layoutTemplates: {
            main2: "{preview} " + " {remove} {browse}"
        },
        allowedFileExtensions: ["png"],
    });

    $("#tableColumnModel, #subsidiaryTable").on("submit", function (e) {
        $.fn.dataTable.tables().forEach(function (table1) {
            var data = [],
                values = $(".multi-col-order")
                .find("input, select:visible")
                .serializeArray(),
                start = null,
                row = {},
                order = 1;
            $.each(values, function () {
                this.name = this.name.replace(/:/g, "");
                if (start == this.name) {
                    start = null;
                    row["order"] = order++;
                    data.push($.extend({}, row));
                    row = {};
                }
                if (!start) start = this.name;
                row[this.name] = this.value;
            });
            if (row && Object.keys(row).length > 0) {
                //last record
                row["order"] = order++;
                data.push(row);
            }
            $("#".concat(table1.id.split("-")[1])).val(JSON.stringify(data));
        });
    });

    if ($('.tableNameFiltering').get(0)) {
        var nodes = table.rows().nodes();

        function setTableColumns() {
            table.clear();
            nodes.filter(function (node) {
                return $(node).data('value') === $('.tableNameFiltering').val()
            }).toArray().forEach(function (d) {
                table.row.add(d);
            });
            table.draw();
        }

        setTableColumns();
        $("form#tableColumnModel, form#subsidiaryTable").on("change", "#table", function () {
            setTableColumns();
        });
    }

    $("#table-columns").on("change", 'select[name="type::"]', function (e) {
        var $this = $(this),
            dd = $this.closest("tr").find('[name="dropdown::"]');
        "dropdown" === $this.val() ? dd.show() : dd.hide();
    });

    if (typeof apiConfirmDialog == "function") apiConfirmDialog();

    function toCamelCase(str) {
        return str
            .toLowerCase()
            .replace(/[^a-zA-Z0-9]+(.)/g, (m, chr) => chr.toUpperCase());
    }

    function getColumnNameOptions(searchIndex) {
        var result = "";
        /**Sonarqube: var i = 0;**/
        if (columns) {
            var c = {};
            for (let column in columns) {
                c = columns[column];
                result +=
                    '<option value="' +
                    toCamelCase(c.name) +
                    '" data-value="' +
                    c.name +
                    '" data-index=' +
                    searchIndex +
                    ' data-type="' +
                    c.type +
                    '">' +
                    c.name +
                    "</option>";
            }
        }
        return result;
    }

    $(document).on("click", "#addSearchParameter", function () {
        $("#search")
            .DataTable()
            .row.add([
                "",
                "<input type='hidden' id='columnType-" +
                searchIndex +
                "' name='search[" +
                searchIndex +
                "][columnType]'" +
                "<div class='form-group'><select id='searchColumn-" +
                searchIndex +
                "' class='form-control custom-select' name='search[" +
                searchIndex +
                "][key]'>" +
                getColumnNameOptions(searchIndex) +
                "</select></div>",
                "<div class='form-group'><select class='form-control custom-select' name='search[" +
                searchIndex +
                "][operation]'>" +
                "<option value='=='>==</option>" +
                "<option value='!='>!=</option>" +
                "<option value='>='>>=</option>" +
                "<option value='>'>></option>" +
                "<option value='<'><</option>" +
                "<option value='<='><=</option>" +
                "<option value='like'>like</option>" +
                "<option value='in'>in</option>" +
                "<option value='notIn'>notIn</option>" +
                "</select></div>",
                "<div class='form-group' id='searchValue-" +
                searchIndex +
                "'>" +
                "<input class='form-control input-group' type='text' name='search[" +
                searchIndex +
                "][value]'></div>",
            ])
            .draw(false);
        makeSelect2();
        $("#searchColumn-" + searchIndex).prop("selectedIndex", 0);
        var dataType = $("#searchColumn-" + searchIndex)
            .find("option:selected")
            .attr("data-type");
        var element = "";
        if (dataType === "date") {
            element =
                '<input class="form-control datepicker" id="search[' +
                searchIndex +
                '][value]" name="search[' +
                searchIndex +
                '][value]" autocomplete="off" placeholder="' +
                i18n["Date"] +
                '">';
        }
        if (dataType === "number") {
            element =
                '<input class="form-control" type="number" id="search[' +
                searchIndex +
                '][value]" name="search[' +
                searchIndex +
                '][value]" autocomplete="off">';
        }
        if (dataType === "text") {
            element =
                '<input class="form-control" type="text" id="search[' +
                searchIndex +
                '][value]" name="search[' +
                searchIndex +
                '][value]" autocomplete="off">';
        }
        $("#searchValue-" + searchIndex).html(element);
        $("#columnType-" + searchIndex).val(dataType);
        searchIndex++;
    });

    $(document).on("click", "a.descript-detail", function () {
        var $this = $(this);
        $.confirm({
            title: $this.data("title") || "",
            content: $this.data("contenttype") === 'sql' ? ("<textarea class='sql-editor readonly'>" + $this.data("content") + "</textarea>") : $this.data("content").replace(' || ', '<br>'),
            columnClass: $this.data("class") || "medium",
            type: $this.data("type") || "blue",
            backgroundDismiss: true,
            buttons: {
                close: {
                    text: i18n["Close"],
                    keys: ["enter"],
                },
            },
            onOpenBefore: function () {
                var editor = this.$content.find('.sql-editor');
                if (editor.length) {
                    makeSqlEditor(editor.get(0));
                }
            }
        });
    });

    $(document).on("click", ".myBtn", function (e) {
        e.preventDefault();
        var $this = $(this).closest("td");
        if (!$this.data("value")) {
            $this = $(this);
        }
        var $uuid = $this.data("value"),
            $user = $this.data("auth"),
            $approvalStatus = $this.data("approval"),
            $approvalMessage = $this.data("message"),
            $controller = $this.data("controller"),
            $rejectPost = "/v1//{uuid}/reject_POST",
            $rejectPostLink = $rejectPost.slice(0, 4) + $controller + $rejectPost.slice(4, 23),
            $cancelPost = "/v1//{uuid}/cancel_POST",
            $cancelPostLink = $cancelPost.slice(0, 4) + $controller + $cancelPost.slice(4, 23),
            $approvePost = "/v1//{uuid}/approve_POST",
            $approvePostLink = $approvePost.slice(0, 4) + $controller + $approvePost.slice(4, 24),
            $sendForApprovalPost = "/v1//{uuid}/sendForApproval_POST",
            $sendForApprovalPostLink = $sendForApprovalPost.slice(0, 4) + $controller + $sendForApprovalPost.slice(4, 32),
            appOrSub = 'app';
        $.confirm({
            title: i18n["Approval Processes"],
            content: '<form action="" method="POST" class="formName">' +
                '<div class="form-group">' +
                '<label class="lastMessage">' + i18n["Last processes message"] + " " + "</label>" +
                "<br>" +
                '<span class="message">' + i18n["Write a Message"] + "</span>" +
                "<br>" +
                '<textarea style="margin-top: 5px;" type="text" name="approvalMessage"  class="approvalMessage form-control" required />' +
                "</div>" +
                "</form>",
            columnClass: "medium",
            type: "blue",
            closeIcon: true,
            buttons: {
                approve: {
                    text: i18n["Approve"],
                    btnClass: "btn btn-green",
                    actionName: "approve",
                    action: function () {
                        var action = this.buttons.approve.actionName;
                        this.buttons.approve.disable();
                        var _this = this;
                        approveAreYouSure(_this, $uuid, action, appOrSub);
                        return false;
                    },
                },
                sendForApproval: {
                    text: i18n["Send For Approval"],
                    btnClass: "btn btn-blue",
                    actionName: "sendForApproval",
                    action: function () {
                        var action = this.buttons.sendForApproval.actionName;
                        this.buttons.sendForApproval.disable();
                        if (!this.$content.find(".approvalMessage").val()) {
                            $.alert(i18n["Write a Message"]);
                            this.buttons.sendForApproval.enable();
                            return false;
                        } else {
                            var _this = this;
                            approveAreYouSure(_this, $uuid, action, appOrSub)
                        }
                        return false;
                    },
                },
                reject: {
                    text: i18n["Reject"],
                    btnClass: "btn btn-orange",
                    actionName: "reject",
                    action: function () {
                        var action = this.buttons.reject.actionName;
                        this.buttons.reject.disable();
                        if (!this.$content.find(".approvalMessage").val()) {
                            $.alert(i18n["Write a Message"]);
                            this.buttons.reject.enable();
                            return false;
                        } else {
                            var _this = this;
                            approveAreYouSure(_this, $uuid, action, appOrSub)
                        }
                        return false;
                    }
                },
                cancel: {
                    text: i18n["Make cancel"],
                    btnClass: "btn btn-red",
                    actionName: 'cancel',
                    icon: "glyphicon glyphicon-heart",
                    action: function () {
                        var action = this.buttons.cancel.actionName;
                        this.buttons.cancel.disable();
                        if (!this.$content.find(".approvalMessage").val()) {
                            $.alert(i18n["Write a Message"]);
                            this.buttons.cancel.enable();
                            return false;
                        } else {
                            var _this = this;
                            approveAreYouSure(_this, $uuid, action, appOrSub)
                        }
                        return false;
                    },
                },
            },
            onOpenBefore: function () {
                $("textarea").attr("placeholder", i18n["Write a Message"]);
                $("<label>").text($approvalMessage).appendTo(".lastMessage");
                if ($approvalStatus === "C") {
                    $(".message").hide();
                    $(".approvalMessage").hide();
                    $(".lastMessage").attr("style", "color:red").text(i18n["This registration has been canceled."] + " ");
                    $("<label>").text(i18n["Cancellation reason"] + $approvalMessage).appendTo(".lastMessage");
                }

                if ($approvalStatus === "N") {
                    $(".lastMessage").hide();
                }
                if ($approvalStatus === "R") {
                    $(".message").text(i18n["This record has been rejected. The record needs to be updated."]);
                }
                if (!($approvalStatus === "W" && $user.rolePermissionAll.includes($approvePostLink))) {
                    this.$$approve.hide();
                }
                if (!($approvalStatus === "N" && $user.rolePermissionAll.includes($sendForApprovalPostLink))) {
                    this.$$sendForApproval.hide();
                }
                if (!(($approvalStatus === "W" || $approvalStatus === "A") && $user.rolePermissionAll.includes($rejectPostLink))) {
                    this.$$reject.hide();
                }
                if (!(($approvalStatus === "R" || $approvalStatus === "N") && $user.rolePermissionAll.includes($cancelPostLink))) {
                    this.$$cancel.hide();
                }
            },
        });
    });

    $(document).on("click", ".btn-request", function (e) {
        e.preventDefault();
        var $this = $(this).closest("td"),
            $uuid = $this.data("value"),
            $user = $this.data("auth"),
            $approver = $this.data("approver"),
            $canceler = $this.data("canceler"),
            $entrant = $this.data("entrant"),
            $processes = $this.data("processes"),
            $checker = $this.data("checker"),
            appOrSub = 'sub';

        if ($processes === 'approvalProcesses') {
            var $inspector = $this.data("inspector"),
                $object = $this.data("object")
        }
        $.confirm({
            title: "",
            content: '<form method="POST">' +
                '<input type="hidden" name="item" value="' + $this.closest('tbody').data("item") + '" />' +
                '<div class="form-group">' +
                '<label for="description"><strong>' + $this.text() + "</strong></label>" +
                '<input type="text" id="description" name="description" placeholder="' + i18n["Description"] + '" class="form-control" required />' +
                '</div>' +
                '</form>',
            columnClass: "medium",
            type: 'blue',
            closeIcon: true,
            typeAnimated: true,
            buttons: {
                request: {
                    text: i18n["Request"],
                    btnClass: "btn btn-blue",
                    isHidden: true,
                    actionName: "waiting",
                    action: function () {
                        var action = this.buttons.request.actionName;
                        this.buttons.request.disable();
                        var _this = this,
                            description = $.trim(_this.$content.find("#description").val()),
                            reason = _this.$content.find("#reason");
                        if ($this.data("required") && (!description || description.length > 2048)) {
                            $.alert(i18n["Description is required"] || "Description is required");
                            _this.buttons.request.enable();
                            return false;
                        } else if ($this.data("required") && reason.get(0) && !reason.val()) {
                            $.alert(i18n["Reason is required"] || "Reason is required");
                            _this.buttons.request.enable();
                            return false;
                        } else {
                            approveAreYouSure(_this, $uuid, action, appOrSub);
                        }
                        return false;
                    },
                },
                cancel: {
                    text: i18n["Make cancel"],
                    btnClass: "btn btn-red",
                    isHidden: true,
                    actionName: "cancel",
                    action: function () {
                        var action = this.buttons.cancel.actionName;
                        this.buttons.cancel.disable();
                        var _this = this,
                            description = $.trim(_this.$content.find("#description").val()),
                            reason = _this.$content.find("#reason");
                        if ($this.data("required") && (!description || description.length > 2048)) {
                            $.alert(i18n["Description is required"] || "Description is required");
                            _this.buttons.cancel.enable();
                            return false;
                        } else if ($this.data("required") && reason.get(0) && !reason.val()) {
                            $.alert(i18n["Reason is required"] || "Reason is required");
                            _this.buttons.cancel.enable();
                            return false;
                        } else {
                            approveAreYouSure(_this, $uuid, action, appOrSub);
                        }
                        return false;
                    },
                },
                reject: {
                    text: i18n["Reject"],
                    btnClass: "btn btn-orange",
                    isHidden: true,
                    actionName: "reject",
                    action: function () {
                        var action = this.buttons.reject.actionName;
                        this.buttons.reject.disable();
                        var _this = this,
                            description = $.trim(_this.$content.find("#description").val()),
                            reason = _this.$content.find("#reason");
                        if ($this.data("required") && (!description || description.length > 2048)) {
                            $.alert(i18n["Description is required"] || "Description is required");
                            _this.buttons.reject.enable();
                            return false;
                        } else if ($this.data("required") && reason.get(0) && !reason.val()) {
                            $.alert(i18n["Reason is required"] || "Reason is required");
                            _this.buttons.reject.enable();
                            return false;
                        } else {
                            approveAreYouSure(_this, $uuid, action, appOrSub);
                        }
                        return false;
                    }
                },
                approve: {
                    text: i18n["Approve"],
                    btnClass: "btn btn-green",
                    isHidden: true,
                    actionName: 'approve',
                    icon: "glyphicon glyphicon-heart",
                    action: function () {
                        var action = this.buttons.approve.actionName;
                        this.buttons.approve.disable();
                        var _this = this,
                            reason = _this.$content.find("#reason");
                        if ($this.data("required") && reason.get(0) && !reason.val()) {
                            $.alert(i18n["Reason is required"] || "Reason is required");
                            _this.buttons.approve.enable();
                            return false;
                        } else {
                            approveAreYouSure(_this, $uuid, action, appOrSub);
                        }
                        return false;
                    },
                },
                check: {
                    text: i18n["Check"],
                    btnClass: "btn btn-warning text-white",
                    isHidden: true,
                    actionName: 'check',
                    action: function () {
                        var action = this.buttons.check.actionName;
                        this.buttons.check.disable();
                        var _this = this;
                        approveAreYouSure(_this, $uuid, action, appOrSub);
                        return false;
                    },
                },
                sendForInspection: {
                    text: i18n["Send For Inspection"],
                    btnClass: "btn btn-blue",
                    isHidden: true,
                    actionName: 'inspect',
                    icon: "glyphicon glyphicon-heart",
                    action: function () {
                        var action = this.buttons.sendForInspection.actionName;
                        this.buttons.sendForInspection.disable();
                        var _this = this,
                            description = $.trim(_this.$content.find("#description").val()),
                            reason = _this.$content.find("#reason");
                        if ($this.data("required") && (!description || description.length > 2048)) {
                            $.alert(i18n["Description is required"] || "Description is required");
                            _this.buttons.sendForInspection.enable();
                            return false;
                        } else if ($this.data("required") && reason.get(0) && !reason.val()) {
                            $.alert(i18n["Reason is required"] || "Reason is required");
                            _this.buttons.sendForInspection.enable();
                            return false;
                        } else {
                            approveAreYouSure(_this, $uuid, action, appOrSub);
                        }
                        return false;
                    },
                },
                sendForApproval: {
                    text: i18n["Send For Approval"],
                    btnClass: "btn btn-blue",
                    isHidden: true,
                    actionName: 'waiting',
                    icon: "glyphicon glyphicon-heart",
                    action: function () {
                        var action = this.buttons.sendForApproval.actionName;
                        this.buttons.sendForApproval.disable();
                        var _this = this,
                            /**Sonarqube: description = $.trim(_this.$content.find("#description").val()),**/
                            reason = _this.$content.find("#reason");
                        // if ($this.data("required") && (!description || description.length > 2048)) {
                        //     $.alert(i18n["Description is required"] || "Description is required");
                        //     _this.buttons.sendForApproval.enable();
                        //     return false;
                        // } else 
                        if ($this.data("required") && reason.get(0) && !reason.val()) {
                            $.alert(i18n["Reason is required"] || "Reason is required");
                            _this.buttons.sendForApproval.enable();
                            return false;
                        } else {
                            approveAreYouSure(_this, $uuid, action, appOrSub);
                        }
                        return false;
                    },
                },
            },
            onOpenBefore: function () {
                var jc = this,
                    select = $('.reasons').find('select#reason').clone();
                if ($processes === 'deadlineProcesses') {
                    if ($approver && $user.rolePermissionAll.includes('/v1/deadline/{uuid}/approve_PUT')) {
                        this.$$approve.show();
                    }
                    if ($approver && $user.rolePermissionAll.includes('/v1/deadline/{uuid}/reject_PUT')) {
                        this.$$reject.show();
                    }
                    if ($entrant) {
                        this.$$request.show();
                    }
                    if ($canceler) {
                        this.$$cancel.show();
                    }
                }
                if ($processes === 'approvalProcesses') {
                    if ($checker) {
                        this.$$check.show();
                    }
                    if ($entrant) {
                        this.$$sendForInspection.show();
                    } else if ($inspector) {
                        if ($user.rolePermissionAll.includes('/v1/approval/{uuid}/waiting_PUT')) {
                            this.$$sendForApproval.show();
                        }
                        if ($user.rolePermissionAll.includes('/v1/approval/{uuid}/reject_PUT')) {
                            this.$$reject.show();
                        }
                    } else if ($approver) {
                        if ($object.approvalStatus === 'W' && $user.uuid !== $object.creator && $user.rolePermissionAll.includes('/v1/approval/{uuid}/approve_PUT')) {
                            this.$$approve.show();
                        }
                        if ($user.rolePermissionAll.includes('/v1/approval/{uuid}/reject_PUT')) {
                            this.$$reject.show();
                        }
                    }
                    if ($canceler) {
                        this.$$cancel.show();
                    }
                }
                if (select.get(0) && select.get(0).options.length > 0 && $entrant && $processes === 'deadlineProcesses') {
                    jc.$content.find('#description').before(select);
                    jc.$content.find('#description').before("</br>");
                    select.select2({
                        placeholder: i18n["Please Choose"],
                        theme: "bootstrap",
                        width: "100%",
                        dropdownParent: $(jc.$jconfirmBoxContainer)
                    });
                }
            }
        });
    });

    function approveAreYouSure(_this, $uuid, action, appOrSub) {
        $.confirm({
            title: '',
            content: i18n["Are you sure you want to continue this process?"],
            buttons: {
                ok: {
                    text: i18n["Yes"],
                    actionName: action,
                    btnClass: "btn btn-green",
                    action: function () {
                        var button = choseAppApprovalButton(action, _this, appOrSub);
                        button.disable();
                        this.buttons.ok.disable();
                        _this.$content.find("form").submit();
                        this.buttons.cancel.disable();
                        return false;
                    },
                },
                cancel: {
                    text: i18n["No"],
                    btnClass: "btn btn-red",
                    action: function () {
                        var button = choseAppApprovalButton(action, _this, appOrSub);
                        button.enable();
                        action = null;
                        return true;
                    }
                },
            },
            onContentReady: function () {
                _this.$content.find("form").on("submit", function (e) {
                    e.preventDefault();
                    if (action) {
                        $("<input>").attr({
                            type: "hidden",
                            name: "uuid",
                            value: $uuid
                        }).appendTo(this);
                        $("<input>").attr({
                            type: "hidden",
                            name: "action",
                            value: action
                        }).appendTo(this);
                        this.submit();
                    } else _this.close();
                });
            },
        });
    }

    function choseAppApprovalButton(action, _this, appOrSub) {
        var button;
        if (appOrSub === 'app') {
            switch (action) {
                case 'approve':
                    button = _this.buttons.approve;
                    break;
                case 'cancel':
                    button = _this.buttons.cancel;
                    break;
                case 'sendForApproval':
                    button = _this.buttons.sendForApproval;
                    break;
                case 'reject':
                    button = _this.buttons.reject;
                    break;
            }
        } else {
            switch (action) {
                case 'approve':
                    button = _this.buttons.approve;
                    break;
                case 'cancel':
                    button = _this.buttons.cancel;
                    break;
                case 'waiting':
                    button = _this.buttons.sendForApproval;
                    break;
                case 'inspect':
                    button = _this.buttons.sendForInspection;
                    break;
                case 'request':
                    button = _this.buttons.request;
                    break;
                case 'reject':
                    button = _this.buttons.reject;
                    break;
                case 'check':
                    button = _this.buttons.check;
                    break;
            }
        }
        return button;
    }

    $(document).on("click", "#dropdownsAddNewRow", function () {
        $("#dropdown-items")
            .DataTable()
            .row.add([
                "",
                "<input class='form-control' type='text' name='value::'>",
                "<input class='form-control' type='text' name='descriptionTr::'>",
                "<input class='form-control' type='text' name='descriptionEn::'>",
                "<select class='form-control' name='status::'>" +
                "<option value='1'>" +
                i18n["Active"] +
                "</option>" +
                "<option value='2'>" +
                i18n["Passive"] +
                "</option>" +
                "</select>",
                "<button class='btn btn-sm btn-outline-danger ruleConditionDeleteRow' type='button'><i class='fas fa-trash-alt'></i></button>",
            ])
            .draw(false);
        makeSelect2();
        scrollDown();
    });

    $("#dropdown").on("submit", function (e) {
        var items = [];
        $.fn.dataTable.tables().forEach(function (table1) {
            var data = [];
            var values = $(table1).find("input, select").serializeArray();
            var start = null;
            var row = {};
            var order = 1;
            $.each(values, function () {
                this.name = this.name.replace(/:/g, "");
                if (start == this.name) {
                    start = null;
                    row["dropdownOrder"] = order++;
                    data.push($.extend({}, row));
                    row = {};
                }
                if (!start) start = this.name;
                row[this.name] = this.value;
            });
            if (row && Object.keys(row).length > 0) {
                //last record
                row["dropdownOrder"] = order++;
                data.push(row);
            }
            items.push(data);
            $("#".concat(table1.id.split("-")[1])).val(JSON.stringify(data));
        });
        return !_.isEmpty(_.flatten(items));
    });

    $("#subsidiary").on("submit", function () {
        var form = $(this).closest("form");
        if (!$(".custom-control-input").is(":checked")) {
            $("<input>")
                .attr({
                    type: "hidden",
                    name: "financial",
                    value: "0"
                })
                .appendTo(form);
        }
    });

    $("#reconciliationCheck").on("submit", function (e) {
        e.preventDefault();
        var $this = $(this),
            query = getCodeMirrorValueFromEditor($this.find(".sql-editor").get(0));
        if (!query) {
            $.alert(i18n['Query cannot be empty.'] || 'Query cannot be empty.');
        } else {
            query = query.replaceAll('`', '\'');
            $("<input>").attr({
                type: "hidden",
                name: "query",
                value: query
            }).appendTo($this);
            $("<input>").attr({
                type: "hidden",
                name: "action",
                value: e.originalEvent.submitter.value
            }).appendTo($this);
            this.submit();
        }
    });

    $("#trendAnalysis").on("submit", function (e) {
        e.preventDefault();
        var $this = $(this),
            query = getCodeMirrorValueFromEditor($this.find(".sql-editor").get(0));
        if (!query) {
            $.alert(i18n['Query cannot be empty.'] || 'Query cannot be empty.');
        } else {
            var data = [];
            table.rows().nodes().each(function (node) {
                var $node = $(node);
                data.push({
                    key: $node.find('.param-key').text(),
                    value: $node.find('.param-value :first-child').val()
                });
            });
            $("<input>").attr({
                type: "hidden",
                name: "params",
                value: JSON.stringify(data)
            }).appendTo($this);
            $("<input>").attr({
                type: "hidden",
                name: "query",
                value: query
            }).appendTo($this);
            $("<input>").attr({
                type: "hidden",
                name: "action",
                value: e.originalEvent.submitter.value
            }).appendTo($this);
            this.submit();
        }
    });

    $(document).on('click', '.selectAll', function () {
        var select = $(this).parents('.form-group').find('.js-multiple-select');
        select.find('option').prop('selected', select.find("option:not(:selected)").length !== 0 ? 'selected' : false);
        select.trigger("change");
    });

    $(document).on('click', '.scripter', function () {
        var $this1 = $(this),
            tr = $this1.closest('tr');
        $.confirm({
            title: '',
            content: parameterTable(tr),
            columnClass: 'large',
            closeIcon: true,
            buttons: {
                script: {
                    text: i18n['Run'] || 'Run',
                    btnClass: 'btn-success',
                    action: function () {
                        var self = this,
                            data = [];
                        self.buttons.script.disable();
                        self.$content.find('table tbody tr').each(function () {
                            var $this2 = $(this);
                            data.push({
                                key: $this2.find('.param-key').text(),
                                value: $this2.find('.param-value :first-child').val()
                            });
                        });
                        $.ajax({
                            url: '/script/' + tr.data('value'),
                            method: 'post',
                            dataType: 'json',
                            data: {
                                queryParams: data
                            }
                        }).done(function (response) {
                            if (response.trendAnalysis && response.trendAnalysis.script && response.trendAnalysis.script.length > 0) {
                                scripter(response.trendAnalysis);
                            } else {
                                $.alert(i18n['No result found or you do not have permission for this action.'] || 'No result found or you do not have permission for this action.');
                            }
                        }).always(function () {
                            self.buttons.script.enable();
                        });
                        return false;
                    }
                }
            },
            onOpenBefore: function () {
                var jc = this,
                    editor = jc.$content.find('.sql-editor');
                if (editor.length) {
                    makeSqlEditor(editor.get(0));
                }
                Array.prototype.slice.call(jc.$content.find('select.js-multiple-select')).forEach(function (select) {
                    $(select).select2({
                        placeholder: i18n["Please Choose"],
                        theme: "bootstrap",
                        width: "element",
                        allowClear: true,
                        dropdownParent: $(jc.$jconfirmBoxContainer)
                    });
                });
            }
        })
    });

    function parameterTable(row) {
        var params = row.data('params');
        var table1 = '<div class="card mt-3">' +
            '<div class="card-body">' +
            '<textarea class="sql-editor readonly">' + row.data('query') + '</textarea>';
        if (params && params.length > 0) {
            table1 += '<div class="table-responsive">' +
                '<table class="w-100">' +
                '<thead>' +
                '<tr>' +
                '<th class="text-center">' + i18n['Key'] + '</th>' +
                '<th class="text-center w-50">' + i18n['Value'] + '</th>' +
                '</tr>' +
                '</thead>' +
                '<tbody>';
            params.forEach(function (param) {
                table1 += '<tr>' +
                    '<td class="param-key font-14 font-weight-bold font-italic">' + param.key + '</td>' +
                    '<td class="param-value">';
                if (param.key === 'subsidiaryCode' && typeof subsidiaries !== 'undefined' && subsidiaries.length > 0) {
                    table1 += '<select class="js-multiple-select js-states form-control">' +
                        '<option></option>';
                    subsidiaries.forEach(function (subsidiary) {
                        table1 += '<option value="' + subsidiary.subsidiaryCode + '"' + (subsidiary.subsidiaryCode === param.value ? 'selected="selected"' : '') + '>' + subsidiary.subsidiaryCode + ' - ' + subsidiary.formalName + '</option>';
                    });
                    table1 += '</select>';
                } else if (param.key === 'reportType') {
                    table1 += '<select class="js-multiple-select js-states form-control">' +
                        '<option></option>' +
                        '<option value="Daily"' + ("Daily" === param.value ? 'selected="selected"' : '') + '>' + i18n["Daily"] + '</option>' +
                        '<option value="Monthly"' + ("Monthly" === param.value ? 'selected="selected"' : '') + '>' + i18n["Monthly"] + '</option>' +
                        '</select>';
                } else {
                    table1 += '<input type="text" class="form-control" value="' + (param.value || '') + '" />';
                }
                table1 += '</td>' + '</tr>';
            });
            table1 += '</tbody>' + '</table>' + '</div>';
        }
        table1 += '</div>' + '</div>';
        return table1;
    }

    function scripter(item) {
        var objects = item.script,
            canvas = document.createElement('canvas'),
            content, list,
            type = (objects[0].length === 3 ? chartTypes.multi : chartTypes.single)[0],
            response = data_separator(objects, type),
            config = {
                type: type,
                data: {
                    labels: response.labels,
                    datasets: response.datasets
                },
                options: organizeOptions(type)
            };
        var chart = new Chart(canvas.getContext('2d'), config);

        if (chartTypes.single.includes(type)) {
            list = listRenderer(_.clone(response), false, chart);
            content = '<div class="card">' +
                '    <div class="card-body">' +
                '       <div class="col-12">' +
                '           <div class="row">' +
                '               <div class="col-lg-6 chart"></div>' +
                '               <div class="col-lg-6 border-left list"></div>' +
                '           </div>' +
                '       </div>' +
                '    </div>' +
                '</div>';
        } else content = canvas;

        $.dialog({
            title: item.graphName || '',
            content: content,
            columnClass: 'xl',
            closeIcon: false,
            containerFluid: true,
            backgroundDismiss: true,
            onOpenBefore: function () {
                var $content = this.$content;
                $content.find('.chart').append(canvas);
                $content.find('.list').append(list);
            }
        })
    }

    function data_separator(objects, type) {
        var labelIdx = chartTypes.single.includes(type) ? 0 : 1,
            response = {
                datasets: []
            };

        response.labels = _.sortBy(_.reject(_.uniq(_.pluck(objects, labelIdx)), _.isNull), function (o) {
            var variable = new Date(o.replace(/(\d{2})\/(\d{2})\/(\d{4})/, "$2/$1/$3"));
            return !isNaN(variable.getTime()) ? variable.getTime() : variable;
        });

        if (labelIdx === 0) {
            var colors = [],
                arr1 = [];

            _.each(response.labels, function (l) {
                colors.push(generateRandomRGB());
                var found = _.find(objects, function (o) {
                    return o[labelIdx] === l
                });
                arr1.push(found ? found[labelIdx + 1] : 0);
            });

            response.datasets.push({
                data: arr1,
                backgroundColor: colors,
                fill: false
            });
        } else {
            _.each(_.reject(_.uniq(_.pluck(objects, labelIdx - 1)), _.isNull), function (label) {
                var color = generateRandomRGB(),
                    arr = [],
                    picked = _.pick(objects, function (d) {
                        return d[labelIdx - 1] === label
                    });

                _.each(response.labels, function (l) {
                    var found = _.find(picked, function (p) {
                        return p[labelIdx] === l
                    });
                    arr.push(found ? found[labelIdx + 1] : 0);
                });

                response.datasets.push({
                    label: label,
                    backgroundColor: color,
                    borderColor: color,
                    borderWidth: 1,
                    fill: false,
                    data: arr
                })
            });
        }

        return response;
    }

    $(document).on("change", "#financialToggle , #nonFinancialToggle", function () {
        var $this = $(this);
        var items = [];
        // var flag = 0;
        var $uuid = $this.data("value");
        // var selectedList = $(".financialList").find("option:selected");
        if ($("#nonFinancialToggle").is(":checked")) {
            $.each($uuid, function () {
                if (this.financial === "0") {
                    var toogleNonFinancial = this;
                    var obj = [toogleNonFinancial.uuid, toogleNonFinancial.name];
                    items.push(obj);

                }
            });
        }
        if ($("#financialToggle").is(":checked")) {
            $.each($uuid, function () {
                var toogleFinancial = this;
                if (toogleFinancial.financial === "1") {
                    var obj = [toogleFinancial.uuid, toogleFinancial.name];
                    items.push(obj);
                }
            });
        }
        $(".financialList").find("option").remove();
        $.each(items, function () {
            $("<option>")
                .attr("value", this[0])
                .attr("selected", "selected")
                .text(this[1])
                .appendTo(".financialList");
        });
    });

    function getCodeMirrorValueFromEditor(target) {
        var result,
            found = target.className.match('(\\s|^)cmSQLEditor-\\d(\\s|$)');
        if (found) {
            result = mirrors[found[0].trim().split("-")[1]].getValue().replace(/\xa0/g, " ");
        }
        return result;
    }

    var previousYear;
    $(document).on('focus', 'input.datepicker-year', function () {
        previousYear = $(this).val();
    }).on("change", 'input.datepicker-year', function () {
        var $this = $(this);
        if (previousYear !== $this.val()) dashboardCharts($this.parents('.db-chart'));
    });

    $(document).on("change", 'select.filter-sb-reportType', function (e) {
        dashboardCharts($(this).parents('.db-chart'));
    });

    function dashboardCharts(elem) {
        var inputs = $('input.datepicker-year, select.filter-sb-reportType');
        inputs.prop('disabled', true);
        elem.loading(i18n['Please Wait']);
        $.ajax({
            url: '/statistic/' + elem.find('.script').data('objects'),
            method: 'post',
            dataType: 'json',
            data: {
                year: elem.find('input.datepicker-year').val(),
                reportType: elem.find('select.filter-sb-reportType').val()
            }
        }).done(function (response) {
            script(response.hasOwnProperty('statistics') ? response.statistics : [], elem.find('canvas'));
        }).always(function () {
            inputs.prop('disabled', false);
            stopLoadingAnimation(elem);
        });
    }

    var reportTable = $('.reportTable');

    if (reportTable.get(0)) reportTableContent();

    function reportTableContent() {
        var content = "",
            objects, filter = {},
            status = $('#filter-sb-status').val(),
            financial = $('#filter-sb-financial').val();

        if (response && response.hasOwnProperty('report')) objects = response.report;

        if (financial) filter.financial = financial;
        filter.approvalStatus = status.map(function (x) {
            return x === 'NE' ? null : x;
        });

        if (Object.keys(filter).length > 0) objects = _.filter(objects, function (row) {
            return (filter.approvalStatus.length === 0 || filter.approvalStatus.includes(row.approvalStatus)) &&
                (!financial || row.financial === financial);
        });

        objects = _.groupBy(objects, 'subsidiary');

        if (objects && objects.constructor === Object && Object.keys(objects).length > 0) {
            for (const [uuid, value] of Object.entries(objects)) {
                var statuses = _.pluck(value, 'approvalStatus'),
                    hasReport = _.reject(statuses, _.isNull).length > 0,
                    approved = _.without(statuses, 'A').length === 0;

                if (!response.hasOwnProperty('usersubsidiary') || response.usersubsidiary.uuid !== uuid) {
                    var s = response.subsidiaries.find(function (s1) {
                        return s1.uuid === uuid
                    });

                    content += '<tr class="tr-parent">' +
                        '<td class="d-flex">' +
                        '<input class="my-auto mr-1" type="checkbox"' + (s.financial === '1' ? 'checked' : '') + ' disabled="disabled"/>' +
                        '<h5 class="text-dark mb-0 font-16 font-weight-medium text-wrap"' + (hasReport ? 'style="cursor: pointer"' : '') + '>' + s.formalName + '</h5>' +
                        '</td>' +
                        '<td class="text-right">' +
                        (hasReport ?
                            '<i class="fas fa-check font-20 ' + (approved ? 'text-success' : 'text-primary') + '"></i>' :
                            '<i class="fas fa-times font-20 text-danger"></i>') +
                        '</td>' +
                        '</tr>';

                    if (hasReport) {
                        value.forEach(function (r1) {
                            content += '<tr style="display: none">' +
                                '<td><button class="btn btn-link font-12 reportDetail" data-uuid="' + r1.subsidiary + '" data-date="' + r1.reportDate + '" data-type="' + r1.reportType + '">' + r1.reportDate + '</button></td>' +
                                '<td class="text-right">';
                            ['A', 'W', 'I', 'N'].forEach(function (s1) {
                                content += '<i class="fas fa-circle font-20 circleReportIcon" style="color: ' + (r1.approvalStatus === s1 ? getStatusColor(r1.approvalStatus) : 'whitesmoke') + '" data-toggle="tooltip" data-placement="top" title="' + getStatusText(s1) + '"></i>';
                            });
                            content += '<i class="fas fa-circle font-20 circleReportIcon" style="color: ' + (!['A', 'W', 'I', 'N'].includes(r1.approvalStatus) ? '#dc3545' : 'whitesmoke') + '" data-toggle="tooltip" data-placement="top" title="' + (i18n['Not Entered'] || 'Not Entered') + '"></i>' +
                                '</td>' +
                                '</tr>';
                        });
                    }
                } else {
                    value.forEach(function (r1) {
                        content += '<tr>' +
                            '<td><button class="btn btn-link font-12 reportDetail" data-uuid="' + r1.subsidiary + '" data-date="' + r1.reportDate + '" data-type="' + r1.reportType + '">' + r1.reportDate + '</button></td>' +
                            '<td class="text-right">';
                        ['A', 'W', 'I', 'N'].forEach(function (s1) {
                            content += '<i class="fas fa-circle font-20 circleReportIcon" style="color: ' + (r1.approvalStatus === s1 ? getStatusColor(r1.approvalStatus) : 'whitesmoke') + '" data-toggle="tooltip" data-placement="left" title="' + getStatusText(s1) + '"></i>';
                        });
                        content += '<i class="fas fa-circle font-20 circleReportIcon" style="color: ' + (!['A', 'W', 'I', 'N'].includes(r1.approvalStatus) ? '#dc3545' : 'whitesmoke') + '" data-toggle="tooltip" data-placement="left" title="' + (i18n['Not Entered'] || 'Not Entered') + '"></i>' +
                            '</td>' +
                            '</tr>';
                    });
                }
            }
        }

        reportTable.find('tbody').html(content);
        $('[data-toggle="tooltip"]').tooltip();
    }

    $(document).on('change', 'select#filter-sb-status, select#filter-sb-financial', function () {
        reportTableContent();
    });

    $('.reportTable tbody').on('click', 'tr.tr-parent', function () {
        $(this).find('i').toggleClass('fa-check fa-chevron-down');
        $(this).nextUntil('.tr-parent').toggle();
    });

    $(document).on("click", 'button.getReport', function () {
        var $this = $(this),
            error,
            card = reportTable.closest('.card'),
            startDate = card.find('[name="startDate"]').val(),
            endDate = card.find('[name="endDate"]').val(),
            options = {
                title: '',
                closeIcon: false,
                containerFluid: true,
                backgroundDismiss: true
            };

        $this.prop('disabled', true);
        card.loading(i18n['Please Wait']);

        if (!startDate) error = i18n['Start date cannot be empty'];
        else if (!endDate) error = i18n['End date cannot be empty'];
        else if (!(toDate(startDate) instanceof Date)) error = i18n['Start date must be in the format DD/MM/YYYY'];
        else if (!(toDate(endDate) instanceof Date)) error = i18n['End date must be in the format DD/MM/YYYY'];
        else if (toDate(startDate).getTime() > toDate(endDate).getTime()) error = i18n['The start date must be less than or equal to the end date'];

        if (error) {
            options.content = error;
            options.onClose = function () {
                $this.prop('disabled', false);
                stopLoadingAnimation(card);
            };
            $.dialog(options);
        } else {
            $.ajax({
                url: '/statistic/report',
                method: 'post',
                dataType: 'json',
                data: {
                    startDate: startDate,
                    endDate: endDate,
                    reportType: card.find('[name="reportType"]').val()
                }
            }).done(function (res) {
                if (res.statistics) {
                    response.report = res.statistics;
                    reportTableContent();
                } else {
                    options.content = res['/v1/statistic/report'];
                    $.dialog(options);
                }
                let resObjectArrat = res.statistics;
                let resultNew = resObjectArrat.reduce((h, obj) => Object.assign(h, {
                    [obj.subsidiary]: (h[obj.subsidiary] || []).concat(obj)
                }), {});

                let financialResponseArray = response.report.filter((obj, pos, arr) => {
                    return arr
                        .map(mapObj => mapObj.subsidiary)
                        .indexOf(obj.subsidiary) == pos;
                }).filter(x => x.financial == 1);

                let financialCompletedCounter = 0;
                for (let i = 0; i < financialResponseArray.length; i++) {
                    let subsProp = financialResponseArray[i].subsidiary;
                    let approvalCounter = 0;

                    for (let j = 0; j < resultNew[subsProp].length; j++) {
                        if (resultNew[subsProp][j]["approvalStatus"] == "A") {
                            approvalCounter++;
                        }
                    }

                    if (approvalCounter == resultNew[subsProp].length) {
                        financialCompletedCounter++;
                    }
                }

                $(".istirakLengthSpan").text(financialCompletedCounter.toString());
            }).always(function () {
                $this.prop('disabled', false);
                stopLoadingAnimation(card);
                $('[data-toggle="tooltip"]').tooltip();
            });
        }
    });

    function windowLoadFinancialCompletedCounter() {

        var $this = $(this),
            error,
            card = $('.reportTable').closest('.card'),
            startDate = card.find('[name="startDate"]').val(),
            endDate = card.find('[name="endDate"]').val(),
            options = {
                title: '',
                closeIcon: false,
                containerFluid: true,
                backgroundDismiss: true
            };
        if (startDate != null && endDate != null) {
            $.ajax({
                url: '/statistic/report',
                method: 'post',
                dataType: 'json',
                data: {
                    startDate: startDate,
                    endDate: endDate,
                    reportType: card.find('[name="reportType"]').val()
                }
            }).done(function (res) {
                if (res.statistics) {
                    response.report = res.statistics;
                    reportTableContent();
                } else {
                    options.content = res['/v1/statistic/report'];
                    $.dialog(options);
                }
                let resObjectArrat = res.statistics;
                let resultNew = resObjectArrat.reduce((h, obj) => Object.assign(h, {
                    [obj.subsidiary]: (h[obj.subsidiary] || []).concat(obj)
                }), {});

                let financialResponseArray = response.report.filter((obj, pos, arr) => {
                    return arr
                        .map(mapObj => mapObj.subsidiary)
                        .indexOf(obj.subsidiary) == pos;
                }).filter(x => x.financial == 1);

                let financialCompletedCounter = 0;
                for (let i = 0; i < financialResponseArray.length; i++) {
                    let subsProp = financialResponseArray[i].subsidiary;
                    let approvalCounter = 0;

                    for (let j = 0; j < resultNew[subsProp].length; j++) {
                        if (resultNew[subsProp][j]["approvalStatus"] == "A") {
                            approvalCounter++;
                        }
                    }

                    if (approvalCounter == resultNew[subsProp].length) {
                        financialCompletedCounter++;
                    }
                }


                $(".istirakLengthSpan").text(financialCompletedCounter.toString());
            });
        }

    }

    function toDate(str) {
        var from = str.split('/');
        return new Date(from[2], from[1], from[0])
    }

    function stopLoadingAnimation(element) {
        var defer = $.Deferred();
        element.loading('stop');
        defer.resolve(element);
        return defer.promise();
    }

    

    $(document).on('click', '.reportTable button.reportDetail', function () {
        var $this = $(this),
            card = $this.closest('.card'),
            uuid = $this.data('uuid'),
            date = $this.data('date'),
            type = $this.data('type'),
            subsidiary = response.subsidiaries.find(function (s) {
                return s.uuid === uuid
            });

        $this.prop('disabled', true);
        card.loading(i18n['Please Wait']);

        $.ajax({
            url: '/statistic/report/detail',
            method: 'post',
            dataType: 'json',
            data: {
                subsidiary: uuid,
                reportDate: date,
                reportType: type
            }
        }).done(function (res) {
            if (res.detail && _.isArray(res.detail) && res.detail.length > 0) {
                $.dialog({
                    title: subsidiary.formalName + ' - ' + date + ' - ' + i18n[type],
                    content: reportDetail(res.detail),
                    columnClass: 'l',
                    closeIcon: true,
                    backgroundDismiss: true
                });
            } else {
                $.alert(i18n['No result found or you do not have permission for this action.'] || 'No result found or you do not have permission for this action.');
            }
        }).always(function () {
            $this.prop('disabled', false);
            stopLoadingAnimation(card);
        });
    });

    function reportDetail(objects) {
        var statuses = _.union.apply(_, _.map(_.pluck(objects, 'statuses'), _.keys)),
            content = '<table class="w-100 table no-wrap v-middle">' +
            '<thead>' +
            '<tr class="text-center font-weight-medium">' +
            '<td class="text-dark font-16">' + i18n['Table Name'] + '</td>';
        statuses.forEach(function (s) {
            var c = toCapitalize(s);
            content += '<td class="text-white font-14" style="background: ' + getStatusColor(c) + ';">' + (i18n[c] || c) + '</td>';
        });
        content += '<td class="text-white font-14" style="background: ' + getStatusColor(0) + ';">' + i18n['Total'] + '</td>' +
            '</tr></thead><tbody>';
        objects.forEach(function (o) {
            content += '<tr class="text-dark font-16">' +
                '<td class="font-weight-medium">' + i18n['model.' + o.tableName || o.tableName] + '</td>';
            statuses.forEach(function (s) {
                content += '<td class="text-right font-weight-bolder">' + o.statuses[s] + '</td>';
            });
            content += '<td class="text-right font-weight-bolder">' + _.reduce(o.statuses, sum, 0) + '</td>';
            content += '</tr>';
        });
        content += '<tr class="text-right text-dark font-weight-bolder font-18">' +
            '<td>' + i18n['Total'] + '</td>';
        statuses.forEach(function (s) {
            content += '<td>' + _.reduce(_.pluck(_.pluck(objects, 'statuses'), s), sum, 0) + '</td>';
        });
        content += '<td>' + _.reduce(_.reduceRight(_.map(_.pluck(objects, 'statuses'), _.values), concat, []), sum, 0) + '</td>' +
            '</tr></tbody></table>';

        return content;
    }

    function toCapitalize(string) {
        return string.charAt(0).toLocaleUpperCase('en-US') + string.slice(1).toLocaleLowerCase('en-US');
    }

    function concat(a, b) {
        return a.concat(b);
    }

    $('.file-input').on('fileimageloaded', function (event, previewId) {
        var indicator = $('.file-upload-indicator');
        if (indicator.length && indicator.children('i').hasClass('text-danger')) {
            $('button[type=submit]').prop('disabled', true);
        } else $('button[type=submit]').prop('disabled', false);
    });

    $('.file-input').on('fileclear', function (event, id, index) {
        $('button[type=submit]').prop('disabled', false);
    });

    $(document).on('click', '#errorCodeUrl', function (e) {
        e.preventDefault();
        var copyText = $(this).text();

        document.addEventListener('copy', function (e) {
            e.clipboardData.setData('text/plain', copyText);
            e.preventDefault();
        }, true);

        document.execCommand('copy');
    })

    /*
    $('form').on('submit', function (e) {
        e.preventDefault();
        e.stopPropagation();
        if ($('.file-upload-indicator').length) {
            $.alert(i18n['Please fix the errors before submit form.'] || 'Please fix the errors before submit form.');
        }
    });
     */


});